import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { validateFieldValue } from "@/lib/validation/field";
import { normalizeUnicode } from "@/lib/validation/normalize";
import type { Prisma } from "@/generated/prisma/client";

function submissionCode(formCode: string) { return `${formCode}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }

export async function createSubmission(actorUserId: string, formDefinitionId: string, context?: Record<string, unknown>) {
  const form = await prisma.formDefinition.findUnique({ where: { id: formDefinitionId }, include: { currentVersion: true } });
  if (!form) throw new Error("FORM_NOT_FOUND"); if (!form.currentVersion || form.currentVersion.status !== "PUBLISHED") throw new Error("FORM_VERSION_NOT_PUBLISHED");
  const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { departmentId: true } });
  const submission = await prisma.formSubmission.create({ data: {
    code: submissionCode(form.code), formDefinitionId: form.id, formVersionId: form.currentVersion.id, createdByUserId: actorUserId,
    departmentId: user?.departmentId, context: context as Prisma.InputJsonValue | undefined, sourceSystem: typeof context?.sourceSystem === "string" ? context.sourceSystem : undefined,
    externalReference: typeof context?.externalReference === "string" ? context.externalReference : undefined,
  }});
  await prisma.auditEvent.create({ data: { actorUserId, action: "SUBMISSION_CREATE", entityType: "FormSubmission", entityId: submission.id } }); return submission;
}

export async function getSubmission(id: string) {
  const submission = await prisma.formSubmission.findUnique({ where: { id }, include: {
    formDefinition: true, formVersion: { include: { fields: { orderBy: { order: "asc" } } } },
    values: { include: { fieldDefinition: true, evidence: { include: { sourceMessage: true } } } },
    conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } }, reviewComments: { include: { user: true }, orderBy: { createdAt: "asc" } }
  }}); if (!submission) throw new Error("SUBMISSION_NOT_FOUND"); return submission;
}

export async function updateFields(actorUserId: string, submissionId: string, expectedRevision: number, updates: { fieldId?: string; fieldKey?: string; value: unknown; confirmedByUser?: boolean }[]) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.formSubmission.findUnique({ where: { id: submissionId }, include: { formVersion: { include: { fields: true } }, values: true } });
    if (!submission) throw new Error("SUBMISSION_NOT_FOUND");
    if (["APPROVED", "ARCHIVED"].includes(submission.status)) throw new Error("SUBMISSION_STATE_CONFLICT");
    if (submission.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
    for (const update of updates) {
      const field = submission.formVersion.fields.find((f) => f.id === update.fieldId || f.key === update.fieldKey); if (!field) throw new Error("FIELD_VALIDATION_ERROR");
      const value = validateFieldValue(field, update.value);
      await tx.formFieldValue.upsert({
        where: { submissionId_fieldDefinitionId: { submissionId, fieldDefinitionId: field.id } },
        create: { submissionId, fieldDefinitionId: field.id, valueJson: value as Prisma.InputJsonValue, normalizedText: typeof value === "string" ? normalizeUnicode(value) : JSON.stringify(value), confirmedByUser: update.confirmedByUser ?? true },
        update: { valueJson: value as Prisma.InputJsonValue, normalizedText: typeof value === "string" ? normalizeUnicode(value) : JSON.stringify(value), confirmedByUser: update.confirmedByUser ?? true, confidence: null, evidence: { deleteMany: {} } },
      });
    }
    const result = await tx.formSubmission.update({ where: { id: submissionId }, data: { revision: { increment: 1 }, status: submission.status === "DRAFT" ? "IN_PROGRESS" : undefined } });
    await tx.auditEvent.create({ data: { actorUserId, action: "FIELD_MANUAL_UPDATE", entityType: "FormSubmission", entityId: submissionId, metadata: { fields: updates.map((u) => u.fieldKey ?? u.fieldId) } } }); return result;
  });
}

export async function submitSubmission(actorUserId: string, submissionId: string, expectedRevision: number) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.formSubmission.findUnique({ where: { id: submissionId }, include: { formVersion: { include: { fields: true } }, values: true } });
    if (!submission) throw new Error("SUBMISSION_NOT_FOUND"); if (submission.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
    if (!["DRAFT", "IN_PROGRESS", "REJECTED"].includes(submission.status)) throw new Error("SUBMISSION_STATE_CONFLICT");
    const present = new Set(submission.values.filter((v) => v.valueJson !== null && v.valueJson !== "").map((v) => v.fieldDefinitionId));
    const missing = submission.formVersion.fields.filter((f) => f.required && !present.has(f.id)); if (missing.length) throw new Error("FIELD_VALIDATION_ERROR");
    const updated = await tx.formSubmission.update({ where: { id: submissionId }, data: { status: "SUBMITTED", submittedAt: new Date(), revision: { increment: 1 } } });
    await tx.auditEvent.create({ data: { actorUserId, action: "SUBMISSION_SUBMIT", entityType: "FormSubmission", entityId: submissionId } }); return updated;
  });
}
