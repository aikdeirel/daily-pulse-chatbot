import "server-only";

/**
 * Embedding service for semantic chat history search.
 * Uses OpenRouter's embedding API with text-embedding-3-small model.
 */

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

interface OpenRouterEmbeddingResponse {
  object: "list";
  data: Array<{
    object: "embedding";
    embedding: number[];
    index: number;
  }>;
  model: string;
  id: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
    cost: number;
  };
}

async function callOpenRouterEmbedding(
  input: string | string[],
): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required for embeddings. Set this environment variable to enable semantic chat history search.",
    );
  }

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: input,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `OpenRouter embedding API error: ${response.status} ${error}`,
    );
  }

  const data: OpenRouterEmbeddingResponse = await response.json();

  // Sort by index to ensure correct order when batching
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await callOpenRouterEmbedding(text);
  return embeddings[0];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return callOpenRouterEmbedding(texts);
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
