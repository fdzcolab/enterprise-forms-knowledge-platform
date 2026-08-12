import { getPublishedForm, userCanStartForm } from "@/modules/forms/service";
import { StartFormButton } from "@/components/start-form-button";
import { requireUser } from "@/modules/auth/session";
import { notFound } from "next/navigation";
export default async function FormDetails({params}:{params:Promise<{formId:string}>}){const user=await requireUser();const {formId}=await params;const f=await getPublishedForm(formId);if(!(await userCanStartForm(user.id,f.id)))notFound();return <section><div className="page-head"><div><span className="eyebrow">{f.code}</span><h1>{f.name}</h1><p>{f.description}</p></div><StartFormButton formDefinitionId={f.id}/></div><div className="panel"><h2>فیلدها</h2><div className="field-summary">{f.currentVersion?.fields.map(x=><div key={x.id}><strong>{x.label}</strong><span>{x.fieldType}{x.required?" · الزامی":""}</span></div>)}</div></div></section>}
