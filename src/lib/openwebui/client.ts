export type OpenWebUIConfig = { baseUrl: string; apiKey: string; knowledgeBaseId: string };

export class OpenWebUIClient {
  constructor(private config: OpenWebUIConfig) {}
  private headers(extra?: HeadersInit) { return { Authorization: `Bearer ${this.config.apiKey}`, Accept: "application/json", ...extra }; }
  async testConnection() {
    const res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1/knowledge/${this.config.knowledgeBaseId}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`OPENWEBUI_HTTP_${res.status}`); return true;
  }
  async uploadMarkdown(filename: string, content: string) {
    const form = new FormData(); form.append("file", new Blob([content], { type: "text/markdown;charset=utf-8" }), filename);
    const res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1/files/`, { method: "POST", headers: this.headers(), body: form });
    if (!res.ok) throw new Error(`OPENWEBUI_UPLOAD_${res.status}`); const data = await res.json() as { id?: string };
    if (!data.id) throw new Error("OPENWEBUI_UPLOAD_INVALID"); return data.id;
  }
  async waitUntilProcessed(fileId: string, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1/files/${fileId}/process/status`, { headers: this.headers() });
      if (!res.ok) throw new Error(`OPENWEBUI_STATUS_${res.status}`);
      const data = await res.json() as { status?: string; error?: string };
      if (data.status === "completed") return;
      if (data.status === "failed") throw new Error(`OPENWEBUI_PROCESS_FAILED:${data.error ?? "unknown"}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** Math.min(i, 4), 8000)));
    }
    throw new Error("OPENWEBUI_PROCESS_TIMEOUT");
  }
  async addToKnowledge(fileId: string) {
    const res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1/knowledge/${this.config.knowledgeBaseId}/file/add`, {
      method: "POST", headers: this.headers({ "Content-Type": "application/json" }), body: JSON.stringify({ file_id: fileId })
    });
    if (!res.ok) throw new Error(`OPENWEBUI_KNOWLEDGE_ADD_${res.status}`);
  }
  async removeFile(fileId: string) {
    const res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1/files/${fileId}`, { method: "DELETE", headers: this.headers() });
    if (!res.ok && res.status !== 404) throw new Error(`OPENWEBUI_DELETE_${res.status}`);
  }
}

export function envOpenWebUIConfig(): OpenWebUIConfig | null {
  if (process.env.OPENWEBUI_SYNC_ENABLED !== "true") return null;
  const baseUrl = process.env.OPENWEBUI_BASE_URL, apiKey = process.env.OPENWEBUI_API_KEY, knowledgeBaseId = process.env.OPENWEBUI_KNOWLEDGE_BASE_ID;
  if (!baseUrl || !apiKey || !knowledgeBaseId) throw new Error("OPENWEBUI_CONFIG_INVALID");
  return { baseUrl, apiKey, knowledgeBaseId };
}
