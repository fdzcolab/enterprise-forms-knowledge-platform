import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export async function publishableSubmission(submissionId: string) {
  const s = await prisma.formSubmission.findUnique({ where:{id:submissionId}, include:{ formDefinition:true, department:true, project:true, values:{ include:{ fieldDefinition:true } } } });
  if (!s) throw new Error("SUBMISSION_NOT_FOUND");
  const fields = s.values.filter((v)=>v.fieldDefinition.isEmbeddable && !v.fieldDefinition.isSensitive).sort((a,b)=>a.fieldDefinition.order-b.fieldDefinition.order);
  const lines = [`# ${s.formDefinition.name}`, "", `Submission: ${s.code}`, `Form: ${s.formDefinition.name}`];
  if (s.project) lines.push(`Project: ${s.project.name}`); if (s.department) lines.push(`Department: ${s.department.name}`); if (s.submittedAt) lines.push(`Date: ${s.submittedAt.toISOString().slice(0,10)}`);
  for (const value of fields) {
    const rendered = typeof value.valueJson === "string" ? value.valueJson : Array.isArray(value.valueJson) ? value.valueJson.join(", ") : JSON.stringify(value.valueJson);
    if (!rendered || rendered === "null") continue; lines.push("", `## ${value.fieldDefinition.label}`, "", rendered);
  }
  const markdown = lines.join("\n").trim()+"\n"; return { submission:s, markdown, contentHash:crypto.createHash("sha256").update(markdown).digest("hex") };
}
export function chunkMarkdown(markdown:string, maxChars=1800) {
  const sections = markdown.split(/\n(?=## )/); const chunks:string[]=[]; let current="";
  for (const section of sections) { if (current && current.length+section.length+1>maxChars) { chunks.push(current.trim()); current=""; } current += (current?"\n":"")+section; }
  if (current.trim()) chunks.push(current.trim()); return chunks;
}
