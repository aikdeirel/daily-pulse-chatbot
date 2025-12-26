import "server-only";

/**
 * Embedding service for semantic chat history search.
 *
 * NOTE: This feature is currently ON HOLD.
 *
 * OpenRouter does not support embedding models (only language models).
 * The searchPastConversations tool requires embeddings to function.
 * Until OpenRouter adds embedding support or an alternative solution is found,
 * this feature cannot be enabled.
 *
 * The tool is conditionally registered only when QDRANT_URL is set,
 * so users won't encounter these errors unless they explicitly try to enable it.
 */

export async function generateEmbedding(_text: string): Promise<number[]> {
  throw new Error(
    "Embedding generation is not available. OpenRouter does not support embedding models. " +
      "The semantic chat history search feature is currently on hold.",
  );
}

export async function generateEmbeddings(
  _texts: string[],
): Promise<number[][]> {
  throw new Error(
    "Embedding generation is not available. OpenRouter does not support embedding models. " +
      "The semantic chat history search feature is currently on hold.",
  );
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
