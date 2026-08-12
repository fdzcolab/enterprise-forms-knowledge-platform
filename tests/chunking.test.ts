import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "@/modules/knowledge/representation";
describe("semantic document chunking",()=>{it("keeps heading sections intact when possible",()=>{const md="# Form\n\nIntro\n\n## Root Cause\n\nA\n\n## Action\n\nB";const chunks=chunkMarkdown(md,30);expect(chunks.length).toBeGreaterThan(1);expect(chunks.join("\n")).toContain("## Root Cause");});});
