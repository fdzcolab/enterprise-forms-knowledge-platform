import { prisma } from "@/lib/db/prisma";
import { audit } from "@/modules/audit/service";
import type { FieldType, Prisma } from "@/generated/prisma/client";

export type FieldInput = {
  key: string; label: string; description?: string; fieldType: FieldType; required?: boolean; order: number; section?: string;
  validationRules?: unknown; options?: unknown; maxLength?: number; minValue?: number; maxValue?: number; agentInstructions?: string;
  isSearchable?: boolean; isEmbeddable?: boolean; isSensitive?: boolean; sourceMapping?: unknown;
};

export async function createFormDefinition(actorUserId: string, input: { name: string; code: string; description?: string; category?: string }) {
  const form = await prisma.formDefinition.create({ data: { ...input, code: input.code.trim().toUpperCase(), createdByUserId: actorUserId } });
  await audit({ actorUserId, action: "FORM_CREATE", entityType: "FormDefinition", entityId: form.id }); return form;
}

export async function createDraftVersion(actorUserId: string, formDefinitionId: string, input: { sourceType?: "MANUAL"|"DOCX"|"XLSX"; sourceFileMetadata?: unknown; sourceStorageKey?: string; instructions?: string; fields: FieldInput[] }) {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.formVersion.findFirst({ where: { formDefinitionId }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
    const version = await tx.formVersion.create({ data: {
      formDefinitionId, versionNumber: (latest?.versionNumber ?? 0) + 1, status: "DRAFT", sourceType: input.sourceType ?? "MANUAL",
      sourceFileMetadata: input.sourceFileMetadata as Prisma.InputJsonValue | undefined, sourceStorageKey: input.sourceStorageKey, instructions: input.instructions, createdByUserId: actorUserId,
      fields: { create: input.fields.map((f) => ({
        ...f,
        validationRules: f.validationRules as Prisma.InputJsonValue | undefined,
        options: f.options as Prisma.InputJsonValue | undefined,
        sourceMapping: f.sourceMapping as Prisma.InputJsonValue | undefined,
      })) }
    }, include: { fields: { orderBy: { order: "asc" } } } });
    await tx.auditEvent.create({ data: { actorUserId, action: "FORM_VERSION_CREATE", entityType: "FormVersion", entityId: version.id } });
    return version;
  });
}

export async function publishVersion(actorUserId: string, versionId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.formVersion.findUnique({ where: { id: versionId }, include: { fields: true } });
    if (!version) throw new Error("FORM_NOT_FOUND");
    if (version.status !== "DRAFT" || !version.fields.length) throw new Error("SUBMISSION_STATE_CONFLICT");
    await tx.formVersion.updateMany({ where: { formDefinitionId: version.formDefinitionId, status: "PUBLISHED" }, data: { status: "RETIRED" } });
    const published = await tx.formVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await tx.formDefinition.update({ where: { id: version.formDefinitionId }, data: { currentVersionId: version.id, isActive: true } });
    await tx.auditEvent.create({ data: { actorUserId, action: "FORM_VERSION_PUBLISH", entityType: "FormVersion", entityId: version.id } });
    return published;
  });
}

export async function listPublishedForms() {
  return prisma.formDefinition.findMany({ where: { isActive: true, currentVersion: { status: "PUBLISHED" } }, include: { currentVersion: { include: { fields: { orderBy: { order: "asc" } } } } }, orderBy: { name: "asc" } });
}

export async function getPublishedForm(idOrCode: string) {
  const form = await prisma.formDefinition.findFirst({ where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }], isActive: true }, include: { currentVersion: { include: { fields: { orderBy: { order: "asc" } } } } } });
  if (!form) throw new Error("FORM_NOT_FOUND"); if (!form.currentVersion || form.currentVersion.status !== "PUBLISHED") throw new Error("FORM_VERSION_NOT_PUBLISHED"); return form;
}


export async function accessibleAssignedFormIds(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, roles: { select: { roleId: true } } },
  });
  if (!user) return [];
  const roleIds = user.roles.map((r) => r.roleId);
  const assignments = await prisma.formAssignment.findMany({
    where: {
      OR: [
        { type: "OPEN" },
        { type: "USER", userId },
        ...(user.departmentId ? [{ type: "DEPARTMENT" as const, departmentId: user.departmentId }] : []),
        ...(roleIds.length ? [{ type: "ROLE" as const, roleId: { in: roleIds } }] : []),
      ],
      formDefinition: { isActive: true, currentVersion: { status: "PUBLISHED" } },
    },
    select: { formDefinitionId: true },
  });
  return [...new Set(assignments.map((a) => a.formDefinitionId))];
}

export async function userCanStartForm(userId: string, formDefinitionId: string) {
  const ids = await accessibleAssignedFormIds(userId);
  return ids.includes(formDefinitionId);
}

export async function listAvailableForms(userId: string) {
  const ids = await accessibleAssignedFormIds(userId);
  if (!ids.length) return [];
  return prisma.formDefinition.findMany({
    where: { id: { in: ids }, isActive: true, currentVersion: { status: "PUBLISHED" } },
    include: { currentVersion: { include: { fields: { orderBy: { order: "asc" } } } } },
    orderBy: { name: "asc" },
  });
}
