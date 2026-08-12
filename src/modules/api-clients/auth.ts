import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export const hashApiKey=(raw:string)=>crypto.createHash("sha256").update(raw).digest("hex");
export async function authenticateApiRequest(request:Request,requiredScope:string){
  const auth=request.headers.get("authorization"); if(!auth?.startsWith("Bearer "))throw new Error("UNAUTHORIZED"); const token=auth.slice(7).trim(); if(!token.startsWith("efk_app_"))throw new Error("UNAUTHORIZED");
  const prefix=token.slice(0,20); const client=await prisma.apiClient.findUnique({where:{keyPrefix:prefix}}); if(!client||!client.isActive||(client.expiresAt&&client.expiresAt<new Date()))throw new Error("API_CLIENT_DISABLED");
  const actual=Buffer.from(hashApiKey(token)); const expected=Buffer.from(client.keyHash); if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))throw new Error("UNAUTHORIZED");
  const scopes=Array.isArray(client.scopes)?client.scopes.map(String):[]; if(!scopes.includes(requiredScope))throw new Error("FORBIDDEN");
  const employeeNo=request.headers.get("x-employee-no"); if(!employeeNo)throw new Error("UNAUTHORIZED"); const user=await prisma.user.findUnique({where:{employeeNo}}); if(!user?.isActive)throw new Error("UNAUTHORIZED");
  await prisma.apiClient.update({where:{id:client.id},data:{lastUsedAt:new Date()}}); return {client,user,scopes};
}
export function generateApiKey(){const token=`efk_app_${crypto.randomBytes(32).toString("base64url")}`;return{token,keyPrefix:token.slice(0,20),keyHash:hashApiKey(token)}};
