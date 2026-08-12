import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_DEFAULTS } from "../src/modules/auth/permissions";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for seeding.`);
  return value;
}

const connectionString = requiredEnv("DATABASE_URL");
const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? adminPassword;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function credentialUser(input:{email:string;username:string;name:string;employeeNo:string;password:string;departmentId:string}){
  const passwordHash=await hashPassword(input.password);
  const user=await prisma.user.upsert({where:{email:input.email},update:{name:input.name,username:input.username,displayUsername:input.username,employeeNo:input.employeeNo,departmentId:input.departmentId,isActive:true},create:{email:input.email,username:input.username,displayUsername:input.username,name:input.name,employeeNo:input.employeeNo,departmentId:input.departmentId,emailVerified:true}});
  await prisma.account.upsert({where:{providerId_accountId:{providerId:"credential",accountId:user.id}},update:{password:passwordHash},create:{userId:user.id,providerId:"credential",accountId:user.id,password:passwordHash}});
  return user;
}

async function main(){
  const maintenance=await prisma.department.upsert({where:{code:"MAINT"},update:{},create:{code:"MAINT",name:"نگهداری و تعمیرات"}});
  const knowledge=await prisma.department.upsert({where:{code:"KM"},update:{},create:{code:"KM",name:"مدیریت دانش"}});
  const engineering=await prisma.department.upsert({where:{code:"ENG"},update:{},create:{code:"ENG",name:"مهندسی"}});

  for(const key of PERMISSIONS) await prisma.permission.upsert({where:{key},update:{},create:{key,description:key.replaceAll("_"," ")}});
  const roles=new Map<string,string>();
  for(const [name,keys] of Object.entries(ROLE_DEFAULTS)){
    const role=await prisma.role.upsert({where:{name},update:{},create:{name,description:`Default ${name} role`}});roles.set(name,role.id);
    for(const key of keys){const permission=await prisma.permission.findUniqueOrThrow({where:{key}});await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}});}
  }

  const admin=await credentialUser({email:process.env.SEED_ADMIN_EMAIL??"admin@local.internal",username:process.env.SEED_ADMIN_USERNAME??"admin",name:process.env.SEED_ADMIN_NAME??"مدیر سامانه",employeeNo:process.env.SEED_ADMIN_EMPLOYEE_NO??"1000",password:adminPassword,departmentId:knowledge.id});
  const employee=await credentialUser({email:"employee@local.internal",username:"employee",name:"کاربر نمونه",employeeNo:"2001",password:demoPassword,departmentId:maintenance.id});
  const reviewer=await credentialUser({email:"reviewer@local.internal",username:"reviewer",name:"بازبین نمونه",employeeNo:"3001",password:demoPassword,departmentId:engineering.id});
  for(const [user,role] of [[admin,"ADMIN"],[employee,"EMPLOYEE"],[reviewer,"REVIEWER"]] as const){await prisma.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:roles.get(role)!}},update:{},create:{userId:user.id,roleId:roles.get(role)!}});}

  const project=await prisma.project.upsert({where:{code:"DEMO-2026"},update:{},create:{code:"DEMO-2026",name:"پروژه نمونه ارتقای کمپرسور",description:"داده نمونه توسعه؛ برای تولید استفاده نشود."}});
  let form=await prisma.formDefinition.findUnique({where:{code:"EQUIPMENT_FAILURE"}});
  if(!form){
    form=await prisma.formDefinition.create({data:{name:"گزارش خرابی تجهیز",code:"EQUIPMENT_FAILURE",description:"ثبت خرابی، علت ریشه‌ای، اقدام اصلاحی و درس‌آموخته",category:"Maintenance",createdByUserId:admin.id}});
    const version=await prisma.formVersion.create({data:{formDefinitionId:form.id,versionNumber:1,status:"PUBLISHED",sourceType:"MANUAL",createdByUserId:admin.id,publishedAt:new Date(),fields:{create:[
      {key:"equipment",label:"تجهیز",fieldType:"SHORT_TEXT",required:true,order:1,section:"مشخصات"},
      {key:"event_date",label:"تاریخ رخداد",fieldType:"DATE",required:true,order:2,section:"مشخصات",isEmbeddable:false},
      {key:"failure_description",label:"شرح خرابی",fieldType:"LONG_TEXT",required:true,order:3,section:"شرح",agentInstructions:"شرح مشاهده‌شده را بدون استنباط علت ثبت کن."},
      {key:"root_cause",label:"علت ریشه‌ای",fieldType:"LONG_TEXT",required:false,order:4,section:"تحلیل"},
      {key:"corrective_action",label:"اقدام اصلاحی",fieldType:"LONG_TEXT",required:false,order:5,section:"اقدام"},
      {key:"lessons_learned",label:"درس‌آموخته",fieldType:"LONG_TEXT",required:false,order:6,section:"دانش"},
      {key:"private_note",label:"یادداشت محرمانه",fieldType:"LONG_TEXT",required:false,order:7,section:"داخلی",isSensitive:true,isEmbeddable:false,isSearchable:false}
    ]}}});
    await prisma.formDefinition.update({where:{id:form.id},data:{currentVersionId:version.id}});
    await prisma.formAssignment.create({data:{formDefinitionId:form.id,type:"OPEN"}});
  }
  const current=await prisma.formDefinition.findUniqueOrThrow({where:{id:form.id},include:{currentVersion:{include:{fields:true}}}});
  if(current.currentVersion){
    const existing=await prisma.formSubmission.findFirst({where:{externalReference:"SEED-EFR-001"}});
    if(!existing){
      const sub=await prisma.formSubmission.create({data:{code:"EFR-2026-SEED01",formDefinitionId:form.id,formVersionId:current.currentVersion.id,createdByUserId:employee.id,status:"APPROVED",departmentId:maintenance.id,projectId:project.id,sourceSystem:"SEED",externalReference:"SEED-EFR-001",submittedAt:new Date(),approvedAt:new Date(),reviewedByUserId:reviewer.id}});
      const values:Record<string,unknown>={equipment:"P-204A",event_date:"2026-08-12",failure_description:"در زمان راه‌اندازی ارتعاش شدید مشاهده شد.",root_cause:"ناهم‌محوری کوپلینگ",corrective_action:"هم‌محوری لیزری انجام شد.",lessons_learned:"هم‌محوری پیش از راه‌اندازی نهایی کنترل شود."};
      for(const field of current.currentVersion.fields){if(field.key in values)await prisma.formFieldValue.create({data:{submissionId:sub.id,fieldDefinitionId:field.id,valueJson:values[field.key] as never,normalizedText:String(values[field.key]),confirmedByUser:true}});}
      await prisma.auditEvent.create({data:{actorUserId:reviewer.id,action:"SEED_APPROVAL",entityType:"FormSubmission",entityId:sub.id}});
    }
  }
  console.log("Seed complete. Demo API client is intentionally not created; create API credentials through administration tooling so raw secrets are never committed or printed.");
}
main().finally(async()=>prisma.$disconnect());