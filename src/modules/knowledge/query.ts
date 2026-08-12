import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { chatModel, contentText, parseJsonObject, embeddingModel } from "@/lib/llm/client";
import { qdrant, qdrantCollection } from "@/lib/vector-store/qdrant";
import { accessibleFormIds } from "@/modules/auth/authorization";
import { QUERY_PLANNER_PROMPT, ANSWER_PROMPT } from "./prompts/query";

const planSchema=z.object({ route:z.enum(["STRUCTURED","SEMANTIC","HYBRID"]), operation:z.enum(["COUNT","LIST","GROUP"]).nullable(), groupBy:z.enum(["department","form"]).nullable(), filters:z.object({formCode:z.string().optional(),year:z.number().int().optional(),status:z.string().optional()}).default({}), semanticQuery:z.string().nullable() });
type Plan=z.infer<typeof planSchema>;

async function planQuestion(question:string):Promise<Plan>{ const r=await chatModel().invoke([new SystemMessage(QUERY_PLANNER_PROMPT),new HumanMessage(question)]); return planSchema.parse(parseJsonObject(contentText(r.content))); }

async function structured(userId:string,plan:Plan){
  const allowed=await accessibleFormIds(userId,"KNOWLEDGE_ANALYTICS"); if(Array.isArray(allowed)&&allowed.length===0)return {type:"structured",rows:[],count:0};
  const where:any={status:"APPROVED"}; if(Array.isArray(allowed))where.formDefinitionId={in:allowed};
  if(plan.filters.formCode)where.formDefinition={code:plan.filters.formCode.toUpperCase()};
  if(plan.filters.year){where.submittedAt={gte:new Date(`${plan.filters.year}-01-01T00:00:00Z`),lt:new Date(`${plan.filters.year+1}-01-01T00:00:00Z`)}};
  if(plan.operation==="COUNT") return {type:"structured",count:await prisma.formSubmission.count({where})};
  if(plan.operation==="GROUP"){
    if(plan.groupBy==="department"){ const rows=await prisma.formSubmission.groupBy({by:["departmentId"],where,_count:{_all:true},orderBy:{_count:{departmentId:"desc"}},take:20}); const deps=await prisma.department.findMany({where:{id:{in:rows.map(r=>r.departmentId).filter(Boolean) as string[]}},select:{id:true,name:true}}); const names=new Map(deps.map(d=>[d.id,d.name])); return {type:"structured",rows:rows.map(r=>({key:r.departmentId?names.get(r.departmentId)??r.departmentId:"Unassigned",count:r._count._all}))}; }
    const rows=await prisma.formSubmission.groupBy({by:["formDefinitionId"],where,_count:{_all:true},orderBy:{_count:{formDefinitionId:"desc"}},take:20}); const forms=await prisma.formDefinition.findMany({where:{id:{in:rows.map(r=>r.formDefinitionId)}},select:{id:true,name:true}}); const names=new Map(forms.map(f=>[f.id,f.name])); return {type:"structured",rows:rows.map(r=>({key:names.get(r.formDefinitionId)??r.formDefinitionId,count:r._count._all}))};
  }
  const rows=await prisma.formSubmission.findMany({where,select:{id:true,code:true,submittedAt:true,formDefinition:{select:{name:true}},department:{select:{name:true}}},orderBy:{submittedAt:"desc"},take:50}); return {type:"structured",rows};
}

async function semantic(userId:string,question:string,plan:Plan){
  const allowed=await accessibleFormIds(userId,"KNOWLEDGE_SEARCH"); if(Array.isArray(allowed)&&allowed.length===0)return [];
  const [vector]=await embeddingModel().embedDocuments([plan.semanticQuery||question]);
  const must:any[]=[{key:"status",match:{value:"APPROVED"}}]; if(Array.isArray(allowed))must.push({key:"formDefinitionId",match:{any:allowed}}); if(plan.filters.formCode)must.push({key:"formCode",match:{value:plan.filters.formCode.toUpperCase()}}); if(plan.filters.year)must.push({key:"year",match:{value:plan.filters.year}});
  const hits=await qdrant().search(qdrantCollection(),{vector,limit:Number(process.env.KNOWLEDGE_TOP_K||8),score_threshold:Number(process.env.KNOWLEDGE_SCORE_THRESHOLD||0.25),filter:{must},with_payload:true});
  return hits.map(h=>({score:h.score,submissionId:String(h.payload?.submissionId||""),submissionCode:String(h.payload?.submissionCode||""),formName:String(h.payload?.formName||""),text:String(h.payload?.text||"")}));
}

export async function answerKnowledgeQuestion(userId:string,question:string){
  const plan=await planQuestion(question); let structuredResult:unknown=null; let sources:any[]=[];
  if(plan.route!=="SEMANTIC")structuredResult=await structured(userId,plan); if(plan.route!=="STRUCTURED")sources=await semantic(userId,question,plan);
  const response=await chatModel().invoke([new SystemMessage(ANSWER_PROMPT),new HumanMessage(JSON.stringify({question,plan,structuredResult,sources}))]);
  const answer=contentText(response.content).trim();
  await prisma.auditEvent.create({data:{actorUserId:userId,action:"KNOWLEDGE_QUERY",entityType:"Knowledge",metadata:{route:plan.route,sourceSubmissionIds:[...new Set(sources.map(s=>s.submissionId))]}}});
  return {answer,route:plan.route,structured:structuredResult,sources:sources.map(s=>({submissionId:s.submissionId,submissionCode:s.submissionCode,formName:s.formName,score:s.score,excerpt:s.text.slice(0,600)}))};
}
