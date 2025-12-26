import "server-only";

// Direct OpenAI API call for embeddings since the AI SDK provider has version incompatibilities
const EMBEDDING_MODEL = "text-embedding-3-small";

async function callOpenAIEmbedding(
  input: string | string[],
): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for embeddings. OpenRouter does not support embedding models.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
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
    throw new Error(`OpenAI embedding API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await callOpenAIEmbedding(text);
  return embeddings[0];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return callOpenAIEmbedding(texts);
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
