import { prisma } from "@/lib/db/prisma";
import { indexSubmission, syncSubmissionToOpenWebUI } from "@/modules/knowledge/indexing";

export async function beginReview(actorUserId:string,submissionId:string) {
  return prisma.$transaction(async(tx)=>{ const s=await tx.formSubmission.findUnique({where:{id:submissionId}}); if(!s)throw new Error("SUBMISSION_NOT_FOUND"); if(s.status!=="SUBMITTED")throw new Error("SUBMISSION_STATE_CONFLICT"); const u=await tx.formSubmission.update({where:{id:submissionId},data:{status:"UNDER_REVIEW",reviewedByUserId:actorUserId,revision:{increment:1}}}); await tx.auditEvent.create({data:{actorUserId,action:"REVIEW_START",entityType:"FormSubmission",entityId:submissionId}}); return u; });
}
export async function reviewDecision(actorUserId:string,submissionId:string,decision:"APPROVE"|"REJECT",comment?:string) {
  const updated=await prisma.$transaction(async(tx)=>{ const s=await tx.formSubmission.findUnique({where:{id:submissionId}}); if(!s)throw new Error("SUBMISSION_NOT_FOUND"); if(!["SUBMITTED","UNDER_REVIEW"].includes(s.status))throw new Error("SUBMISSION_STATE_CONFLICT"); const status=decision==="APPROVE"?"APPROVED":"REJECTED"; const u=await tx.formSubmission.update({where:{id:submissionId},data:{status,approvedAt:decision==="APPROVE"?new Date():null,reviewedByUserId:actorUserId,revision:{increment:1}}}); if(comment)await tx.reviewComment.create({data:{submissionId,userId:actorUserId,body:comment,action:decision}}); await tx.auditEvent.create({data:{actorUserId,action:decision==="APPROVE"?"SUBMISSION_APPROVE":"SUBMISSION_REJECT",entityType:"FormSubmission",entityId:submissionId}}); return u; });
  if(decision==="APPROVE") { const warnings:string[]=[]; try{await indexSubmission(submissionId);}catch(e){warnings.push(`internal_index:${e instanceof Error?e.message:"failed"}`);} const sync=await syncSubmissionToOpenWebUI(submissionId); if("error" in sync&&sync.error)warnings.push(`openwebui:${sync.error}`); return {submission:updated,warnings}; }
  return {submission:updated,warnings:[]};
}
