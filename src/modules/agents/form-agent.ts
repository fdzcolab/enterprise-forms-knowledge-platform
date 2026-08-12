import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { chatModel, contentText, parseJsonObject } from "@/lib/llm/client";
import { evidenceExists } from "@/lib/validation/normalize";
import { validateFieldValue } from "@/lib/validation/field";
import { FORM_EXTRACTION_PROMPT, QUESTION_PROMPT } from "./prompts/form-filling";
import type { FormFieldDefinition, Prisma } from "@/generated/prisma/client";

const proposalSchema = z.object({
  updates: z.array(z.object({ fieldKey: z.string(), value: z.unknown(), confidence: z.number().min(0).max(1), evidence: z.string() })),
  nextQuestion: z.string().nullable().optional(),
});

type Field = FormFieldDefinition;
type Proposal = z.infer<typeof proposalSchema>;
const AgentState = Annotation.Root({
  message: Annotation<string>, fields: Annotation<Field[]>, currentValues: Annotation<Record<string, unknown>>,
  confirmedFieldKeys: Annotation<string[]>, proposal: Annotation<Proposal>, validatedUpdates: Annotation<Proposal["updates"]>,
  nextQuestion: Annotation<string | null>,
});

async function extract(state: typeof AgentState.State) {
  const response = await chatModel().invoke([
    new SystemMessage(FORM_EXTRACTION_PROMPT),
    new HumanMessage(JSON.stringify({
      allowedFields: state.fields.map((f) => ({ key: f.key, label: f.label, description: f.description, type: f.fieldType, required: f.required, options: f.options, agentInstructions: f.agentInstructions })),
      currentValues: state.currentValues,
      confirmedFieldKeys: state.confirmedFieldKeys,
      employeeMessage: state.message,
    })),
  ]);
  return { proposal: proposalSchema.parse(parseJsonObject(contentText(response.content))) };
}

function validate(state: typeof AgentState.State) {
  const byKey = new Map(state.fields.map((f) => [f.key, f]));
  const confirmed = new Set(state.confirmedFieldKeys);
  const updates: Proposal["updates"] = [];
  for (const candidate of state.proposal.updates) {
    const field = byKey.get(candidate.fieldKey); if (!field || confirmed.has(field.key)) continue;
    if (!evidenceExists(state.message, candidate.evidence)) continue;
    try { updates.push({ ...candidate, value: validateFieldValue(field, candidate.value) }); } catch { /* reject unsafe candidate */ }
  }
  return { validatedUpdates: updates };
}

async function nextQuestion(state: typeof AgentState.State) {
  const proposedKeys = new Set(state.validatedUpdates.map((u) => u.fieldKey));
  const missing = state.fields.filter((f) => f.required && !(f.key in state.currentValues) && !proposedKeys.has(f.key) && !state.confirmedFieldKeys.includes(f.key)).sort((a,b)=>a.order-b.order);
  if (!missing[0]) return { nextQuestion: "اطلاعات الزامی فرم تکمیل شده است. لطفاً مقادیر را مرور و در صورت نیاز اصلاح کنید." };
  const field = missing[0];
  try {
    const response = await chatModel().invoke([new SystemMessage(QUESTION_PROMPT), new HumanMessage(JSON.stringify({ field: { key: field.key, label: field.label, description: field.description, instructions: field.agentInstructions }, currentValues: state.currentValues }))]);
    return { nextQuestion: contentText(response.content).trim().slice(0, 500) || `لطفاً ${field.label} را وارد کنید.` };
  } catch { return { nextQuestion: `لطفاً ${field.label} را وارد کنید.` }; }
}

const graph = new StateGraph(AgentState).addNode("extract", extract).addNode("validate", validate).addNode("next", nextQuestion).addEdge(START,"extract").addEdge("extract","validate").addEdge("validate","next").addEdge("next",END).compile();

export async function processConversationMessage(args: { userId: string; submissionId: string; content: string; clientMessageId: string }) {
  const existing = await prisma.message.findFirst({ where: { clientMessageId: args.clientMessageId, conversation: { submissionId: args.submissionId } }, include: { conversation: true } });
  if (existing) return { idempotent: true, userMessage: existing };
  let conversation = await prisma.conversationSession.findFirst({ where: { submissionId: args.submissionId, userId: args.userId }, orderBy: { createdAt: "desc" } });
  if (!conversation) conversation = await prisma.conversationSession.create({ data: { submissionId: args.submissionId, userId: args.userId } });
  const userMessage = await prisma.message.create({ data: { conversationId: conversation.id, role: "USER", content: args.content, clientMessageId: args.clientMessageId } });
  const submission = await prisma.formSubmission.findUnique({ where: { id: args.submissionId }, include: { formVersion: { include: { fields: { orderBy: { order: "asc" } } } }, values: { include: { fieldDefinition: true } } } });
  if (!submission) throw new Error("SUBMISSION_NOT_FOUND");
  if (["SUBMITTED","UNDER_REVIEW","APPROVED","ARCHIVED"].includes(submission.status)) throw new Error("SUBMISSION_STATE_CONFLICT");
  const currentValues = Object.fromEntries(submission.values.map((v) => [v.fieldDefinition.key, v.valueJson]));
  const confirmedFieldKeys = submission.values.filter((v)=>v.confirmedByUser).map((v)=>v.fieldDefinition.key);
  try {
    const result = await graph.invoke({ message: args.content, fields: submission.formVersion.fields, currentValues, confirmedFieldKeys, proposal: { updates: [], nextQuestion: null }, validatedUpdates: [], nextQuestion: null });
    await prisma.$transaction(async (tx) => {
      for (const update of result.validatedUpdates) {
        const field = submission.formVersion.fields.find((f)=>f.key===update.fieldKey)!;
        const prior = submission.values.find((v)=>v.fieldDefinitionId===field.id); if (prior?.confirmedByUser) continue;
        const fieldValue = await tx.formFieldValue.upsert({
          where: { submissionId_fieldDefinitionId: { submissionId: submission.id, fieldDefinitionId: field.id } },
          create: { submissionId: submission.id, fieldDefinitionId: field.id, valueJson: update.value as Prisma.InputJsonValue, normalizedText: typeof update.value === "string" ? update.value : JSON.stringify(update.value), confidence: update.confidence },
          update: { valueJson: update.value as Prisma.InputJsonValue, normalizedText: typeof update.value === "string" ? update.value : JSON.stringify(update.value), confidence: update.confidence, confirmedByUser: false, evidence: { deleteMany: {} } },
        });
        await tx.fieldEvidence.create({ data: { fieldValueId: fieldValue.id, sourceMessageId: userMessage.id, evidenceText: update.evidence, confidence: update.confidence, modelMetadata: { model: process.env.LLM_MODEL } } });
      }
      await tx.formSubmission.update({ where: { id: submission.id }, data: { status: submission.status === "DRAFT" ? "IN_PROGRESS" : undefined, revision: { increment: 1 } } });
      await tx.message.create({ data: { conversationId: conversation!.id, role: "ASSISTANT", content: result.nextQuestion || "لطفاً اطلاعات فرم را مرور کنید.", metadata: { extractedFields: result.validatedUpdates.map((u)=>u.fieldKey) } } });
    });
    return { idempotent: false, userMessage, updates: result.validatedUpdates, nextQuestion: result.nextQuestion };
  } catch (error) {
    await prisma.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: "در پردازش پیام خطایی رخ داد. پیام شما محفوظ است و می‌توانید دوباره تلاش کنید.", metadata: { errorCode: "AGENT_UNAVAILABLE" } } });
    return { idempotent: false, userMessage, updates: [], nextQuestion: null, recoverableError: error instanceof Error ? error.message : "AGENT_UNAVAILABLE" };
  }
}
