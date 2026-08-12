import { getPublishedForm, userCanStartForm } from "@/modules/forms/service";
import { authenticateApiRequest } from "@/modules/api-clients/auth";
import { toApiError } from "@/lib/http/errors";
export async function GET(request:Request,{params}:{params:Promise<{formId:string}>}){try{const {user}=await authenticateApiRequest(request,"forms:read");const {formId}=await params;const f=await getPublishedForm(formId);if(!(await userCanStartForm(user.id,f.id)))throw new Error("FORBIDDEN");return Response.json({data:f});}catch(e){return toApiError(e);}}
