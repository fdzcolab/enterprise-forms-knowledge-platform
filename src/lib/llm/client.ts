import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export function chatModel() {
  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseURL || !apiKey || !model) throw new Error("AGENT_UNAVAILABLE");
  return new ChatOpenAI({ apiKey, model, temperature: 0, maxRetries: 1, configuration: { baseURL } });
}

export function embeddingModel() {
  const baseURL = process.env.EMBEDDING_BASE_URL;
  const apiKey = process.env.EMBEDDING_API_KEY;
  const model = process.env.EMBEDDING_MODEL;
  if (!baseURL || !apiKey || !model) throw new Error("EMBEDDING_UNAVAILABLE");
  return new OpenAIEmbeddings({ apiKey, model, configuration: { baseURL } });
}

export function contentText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : (part && typeof part === "object" && "text" in part ? String(part.text) : "")).join("");
  return String(content ?? "");
}

export function parseJsonObject(text: string) {
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean) as unknown; } catch {
    const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1)) as unknown;
    throw new Error("LLM_JSON_INVALID");
  }
}
