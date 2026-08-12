import { describe, expect, it } from "vitest";
import { evidenceExists, normalizeUnicode } from "@/lib/validation/normalize";
describe("Persian normalization and evidence grounding",()=>{
  it("normalizes Arabic variants and whitespace",()=>expect(normalizeUnicode("  كاربرد  يک  ")).toBe("کاربرد یک"));
  it("accepts only evidence present in the source",()=>{expect(evidenceExists("علت خرابی ناهم‌محوری کوپلینگ بود","ناهم‌محوری کوپلینگ")).toBe(true);expect(evidenceExists("خرابی پمپ","شکست یاتاقان")).toBe(false);});
});
