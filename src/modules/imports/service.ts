import path from "node:path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { chatModel, contentText, parseJsonObject } from "@/lib/llm/client";
import { storeFile } from "@/lib/storage/local";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

const proposedField = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/), label: z.string().min(1), description: z.string().optional(),
  fieldType: z.enum(["SHORT_TEXT","LONG_TEXT","NUMBER","INTEGER","DATE","DATETIME","BOOLEAN","SINGLE_SELECT","MULTI_SELECT","TAGS","EMAIL","PHONE","URL"]),
  required: z.boolean().default(false), order: z.number().int().nonnegative(), section: z.string().optional(), options: z.array(z.string()).optional(),
  maxLength: z.number().int().positive().optional(), agentInstructions: z.string().optional(), isSearchable: z.boolean().default(true), isEmbeddable: z.boolean().default(true), isSensitive: z.boolean().default(false),
  sourceMapping: z.record(z.string(), z.unknown()).optional(),
});
const proposedSchema = z.object({ name: z.string().min(1), code: z.string().min(2), description: z.string().optional(), category: z.string().optional(), fields: z.array(proposedField).min(1) });

export type NormalizedDocument = { type: "DOCX"|"XLSX"; filename: string; text: string; blocks: unknown[] };

async function normalizeDocx(buffer: Buffer, filename: string): Promise<NormalizedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const lines = result.value.split(/\r?\n/).map((x)=>x.trim()).filter(Boolean);
  return { type: "DOCX", filename, text: result.value.slice(0, 50000), blocks: lines.map((text,index)=>({ kind:"paragraph", index, text })) };
}

async function normalizeXlsx(buffer: Buffer, filename: string): Promise<NormalizedDocument> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true, cellDates: true });
  const blocks: unknown[] = []; const textParts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]; const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    for (let r=range.s.r; r<=Math.min(range.e.r, 500); r++) {
      const row: { cell:string; value:unknown }[] = [];
      for (let c=range.s.c; c<=Math.min(range.e.c, 50); c++) {
        const address = XLSX.utils.encode_cell({r,c}); const cell = sheet[address]; if (!cell || cell.v === undefined || cell.v === "") continue;
        row.push({ cell: address, value: cell.v }); textParts.push(`${sheetName}!${address}: ${String(cell.v)}`);
      }
      if (row.length) blocks.push({ kind:"row", sheet:sheetName, row:r+1, cells:row });
    }
  }
  return { type: "XLSX", filename, text: textParts.join("\n").slice(0,50000), blocks };
}

export async function parseAndProposeImport(args: { filename: string; mimeType: string; buffer: Buffer }) {
  const max = Number(process.env.MAX_IMPORT_BYTES || 10_485_760); if (args.buffer.length > max) throw new Error("BAD_REQUEST");
  const ext = path.extname(args.filename).toLowerCase(); if (![".docx",".xlsx"].includes(ext)) throw new Error("BAD_REQUEST");
  const storageKey = await storeFile(args.buffer, args.filename);
  const job = await prisma.formImportJob.create({ data: { filename: args.filename, mimeType: args.mimeType, storageKey, status: "PARSING" } });
  try {
    const normalized = ext === ".docx" ? await normalizeDocx(args.buffer,args.filename) : await normalizeXlsx(args.buffer,args.filename);
    const response = await chatModel().invoke([
      new SystemMessage(`You convert an existing enterprise Word/Excel form into a proposed generic digital form schema. Return JSON only with name, code, description, category and fields. Never publish it. Infer conservatively from labels, headings, blank/value areas and lists. Use stable snake_case keys. Mark potentially personal/confidential narrative fields sensitive when clearly indicated. Do not invent fields unrelated to the source.`),
      new HumanMessage(JSON.stringify({ document: normalized }))
    ]);
    const proposal = proposedSchema.parse(parseJsonObject(contentText(response.content)));
    await prisma.formImportJob.update({ where:{id:job.id}, data:{ status:"NEEDS_REVIEW", normalizedDocument: normalized as unknown as Prisma.InputJsonValue, proposedSchema: proposal as unknown as Prisma.InputJsonValue } });
    return { jobId: job.id, normalized, proposal };
  } catch (error) {
    await prisma.formImportJob.update({ where:{id:job.id}, data:{ status:"FAILED", errorCode: error instanceof Error ? error.message.slice(0,100) : "IMPORT_FAILED", errorMessage:"Import parsing or schema proposal failed." } }); throw error;
  }
}

export async function finalizeImport(args:{actorUserId:string;jobId:string;proposal:z.infer<typeof proposedSchema>;publish?:boolean}){
  const proposal=proposedSchema.parse(args.proposal); const job=await prisma.formImportJob.findUnique({where:{id:args.jobId}}); if(!job)throw new Error("FORM_NOT_FOUND"); if(job.status!=="NEEDS_REVIEW")throw new Error("SUBMISSION_STATE_CONFLICT");
  const {createFormDefinition,createDraftVersion,publishVersion}=await import("@/modules/forms/service");
  const form=await createFormDefinition(args.actorUserId,{name:proposal.name,code:proposal.code,description:proposal.description,category:proposal.category});
  const version=await createDraftVersion(args.actorUserId,form.id,{sourceType:path.extname(job.filename).toLowerCase()===".docx"?"DOCX":"XLSX",sourceStorageKey:job.storageKey,sourceFileMetadata:{filename:job.filename,mimeType:job.mimeType,importJobId:job.id},fields:proposal.fields});
  await prisma.formImportJob.update({where:{id:job.id},data:{formDefinitionId:form.id,formVersionId:version.id,status:"READY",proposedSchema:proposal as unknown as Prisma.InputJsonValue}});
  if(args.publish)await publishVersion(args.actorUserId,version.id); return {form,versionId:version.id,published:Boolean(args.publish)};
}
