import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenWebUIClient } from "@/lib/openwebui/client";
afterEach(()=>vi.restoreAllMocks());
describe("OpenWebUIClient",()=>{
  it("uploads, waits for processing, then associates the file",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({id:"file-1"}),{status:200,headers:{"Content-Type":"application/json"}})).mockResolvedValueOnce(new Response(JSON.stringify({status:"completed"}),{status:200,headers:{"Content-Type":"application/json"}})).mockResolvedValueOnce(new Response("{}",{status:200}));
    const c=new OpenWebUIClient({baseUrl:"https://rag.example",apiKey:"secret",knowledgeBaseId:"kb-1"});const id=await c.uploadMarkdown("x.md","# x");await c.waitUntilProcessed(id,1);await c.addToKnowledge(id);
    expect(fetchMock).toHaveBeenCalledTimes(3);expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/files/");expect(String(fetchMock.mock.calls[2][0])).toContain("/api/v1/knowledge/kb-1/file/add");
  });
  it("does not ignore permanent upload failures",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("unauthorized",{status:401}));const c=new OpenWebUIClient({baseUrl:"https://rag.example",apiKey:"bad",knowledgeBaseId:"kb"});await expect(c.uploadMarkdown("x.md","x")).rejects.toThrow("OPENWEBUI_UPLOAD_401");});
});
