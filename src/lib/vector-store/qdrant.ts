import { QdrantClient } from "@qdrant/js-client-rest";

export function qdrant() {
  const url = process.env.QDRANT_URL;
  if (!url) throw new Error("VECTOR_STORE_UNAVAILABLE");
  return new QdrantClient({ url, apiKey: process.env.QDRANT_API_KEY || undefined });
}

export const qdrantCollection = () => process.env.QDRANT_COLLECTION || "enterprise_knowledge";

export async function ensureCollection(dimensions: number) {
  const client = qdrant(); const name = qdrantCollection();
  const collections = await client.getCollections();
  if (!collections.collections.some((c) => c.name === name)) {
    await client.createCollection(name, { vectors: { size: dimensions, distance: "Cosine" } });
  }
}
