import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embed, embedMany } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });

  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Batch embedding for efficiency
  const { embeddings } = await embedMany({
    model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
    values: texts,
  });

  return embeddings;
}

export function extractTextFromParts(parts: unknown[]): string {
  if (!Array.isArray(parts)) return "";

  return parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: string }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("\n");
}
