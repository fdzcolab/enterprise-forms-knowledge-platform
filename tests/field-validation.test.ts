import { describe, expect, it } from "vitest";
import { validateFieldValue } from "@/lib/validation/field";
const base={required:true,maxLength:null,minValue:null,maxValue:null,options:null};
describe("dynamic field validation",()=>{
  it("validates integer bounds",()=>{expect(validateFieldValue({...base,fieldType:"INTEGER",minValue:1,maxValue:10} as never,"5")).toBe(5);expect(()=>validateFieldValue({...base,fieldType:"INTEGER"} as never,1.5)).toThrow("FIELD_VALIDATION_ERROR");});
  it("enforces select options",()=>expect(()=>validateFieldValue({...base,fieldType:"SINGLE_SELECT",options:["A","B"]} as never,"C")).toThrow("FIELD_VALIDATION_ERROR"));
  it("validates ISO dates",()=>{expect(validateFieldValue({...base,fieldType:"DATE"} as never,"2026-08-12")).toBe("2026-08-12");expect(()=>validateFieldValue({...base,fieldType:"DATE"} as never,"12/08/2026")).toThrow("FIELD_VALIDATION_ERROR");});
});
