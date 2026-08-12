import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { embeddingModel } from "@/lib/llm/client";
import { ensureCollection, qdrant, qdrantCollection } from "@/lib/vector-store/qdrant";
import { publishableSubmission, chunkMarkdown } from "./representation";
import { OpenWebUIClient, envOpenWebUIConfig } from "@/lib/openwebui/client";

function pointId(seed:string) { const h=crypto.createHash("md5").update(seed).digest("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; }

export async function indexSubmission(submissionId:string) {
  const {submission,markdown,contentHash}=await publishableSubmission(submissionId); if (submission.status!=="APPROVED") throw new Error("SUBMISSION_STATE_CONFLICT");
  const collection=qdrantCollection(); const existing=await prisma.knowledgeIndexRecord.findUnique({ where:{submissionId_provider_collection:{submissionId,provider:"QDRANT",collection}} });
  if (existing?.status==="INDEXED" && existing.contentHash===contentHash) return existing;
  const record=await prisma.knowledgeIndexRecord.upsert({ where:{submissionId_provider_collection:{submissionId,provider:"QDRANT",collection}}, create:{submissionId,collection,contentHash,embeddingModel:process.env.EMBEDDING_MODEL||"unknown",status:"INDEXING"}, update:{contentHash,embeddingModel:process.env.EMBEDDING_MODEL||"unknown",status:"INDEXING",lastError:null} });
  try {
    const chunks=chunkMarkdown(markdown); const vectors=await embeddingModel().embedDocuments(chunks); if (!vectors.length) throw new Error("EMBEDDING_UNAVAILABLE");
    await ensureCollection(vectors[0].length); const client=qdrant();
    await client.delete(collection,{filter:{must:[{key:"submissionId",match:{value:submissionId}}]}});
    await client.upsert(collection,{wait:true,points:chunks.map((text,i)=>({ id:pointId(`${submissionId}:${i}`), vector:vectors[i], payload:{ submissionId, formDefinitionId:submission.formDefinitionId, formVersionId:submission.formVersionId, formCode:submission.formDefinition.code, departmentId:submission.departmentId, projectId:submission.projectId, year:(submission.submittedAt||submission.createdAt).getFullYear(), status:submission.status, text, submissionCode:submission.code, formName:submission.formDefinition.name } }))});
    return prisma.knowledgeIndexRecord.update({where:{id:record.id},data:{status:"INDEXED",indexedAt:new Date()}});
  } catch(error) { await prisma.knowledgeIndexRecord.update({where:{id:record.id},data:{status:"FAILED",lastError:error instanceof Error?error.message.slice(0,500):"INDEX_FAILED"}}); throw error; }
}

export async function syncSubmissionToOpenWebUI(submissionId:string) {
  const config=envOpenWebUIConfig(); if (!config) return { skipped:true as const };
  const {submission,markdown,contentHash}=await publishableSubmission(submissionId);
  if (process.env.OPENWEBUI_SYNC_APPROVED_ONLY!=="false" && submission.status!=="APPROVED") return { skipped:true as const };
  const prior=await prisma.externalKnowledgeSync.findUnique({ where:{submissionId_provider_targetId:{submissionId,provider:"OPENWEBUI",targetId:config.knowledgeBaseId}} });
  if (prior?.status==="SYNCED" && prior.contentHash===contentHash) return { skipped:true as const, duplicateAvoided:true };
  const sync=await prisma.externalKnowledgeSync.upsert({ where:{submissionId_provider_targetId:{submissionId,provider:"OPENWEBUI",targetId:config.knowledgeBaseId}}, create:{submissionId,provider:"OPENWEBUI",targetId:config.knowledgeBaseId,contentHash,status:"SYNCING",lastAttemptAt:new Date()}, update:{contentHash,status:"SYNCING",lastAttemptAt:new Date(),lastError:null} });
  const client=new OpenWebUIClient(config);
  try {
    if (prior?.externalFileId && prior.contentHash!==contentHash && process.env.OPENWEBUI_REMOVE_STALE!=="false") await client.removeFile(prior.externalFileId);
    const fileId=await client.uploadMarkdown(`${submission.code}.md`,markdown); await client.waitUntilProcessed(fileId); await client.addToKnowledge(fileId);
    await prisma.externalKnowledgeSync.update({where:{id:sync.id},data:{status:"SYNCED",externalFileId:fileId,lastSyncedAt:new Date()}}); return {skipped:false as const,fileId};
  } catch(error) { await prisma.externalKnowledgeSync.update({where:{id:sync.id},data:{status:"FAILED",lastError:error instanceof Error?error.message.slice(0,500):"OPENWEBUI_SYNC_FAILED"}}); return {skipped:false as const,error:error instanceof Error?error.message:"OPENWEBUI_SYNC_FAILED"}; }
}

export async function removeExternalKnowledge(submissionId:string) {
  const config=envOpenWebUIConfig(); if (!config) return; const prior=await prisma.externalKnowledgeSync.findUnique({ where:{submissionId_provider_targetId:{submissionId,provider:"OPENWEBUI",targetId:config.knowledgeBaseId}} });
  if (!prior?.externalFileId) return; const client=new OpenWebUIClient(config); await client.removeFile(prior.externalFileId); await prisma.externalKnowledgeSync.update({where:{id:prior.id},data:{status:"REMOVED"}});
}
