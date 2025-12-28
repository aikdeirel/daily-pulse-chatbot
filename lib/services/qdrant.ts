import "server-only";

import { QdrantClient } from "@qdrant/js-client-rest";
import type {
  ChatMessageVectorPayload,
  SearchResult,
} from "@/lib/types/vector";

const COLLECTION_NAME = "chat_messages";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    const url = process.env.QDRANT_URL || "http://localhost:6333";
    const apiKey = process.env.QDRANT_API_KEY;

    client = new QdrantClient({ url, apiKey });
  }
  return client;
}

export async function ensureCollection(): Promise<void> {
  const qdrantClient = getQdrantClient();

  const exists = await qdrantClient.collectionExists(COLLECTION_NAME);
  if (exists.exists) return;

  await qdrantClient.createCollection(COLLECTION_NAME, {
    vectors: { size: 1536, distance: "Cosine" },
  });

  // Create payload indexes
  await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
    field_name: "user_id",
    field_schema: "keyword",
  });
  await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
    field_name: "timestamp",
    field_schema: "datetime",
  });
}

export async function upsertMessageVector(
  messageId: string,
  vector: number[],
  payload: ChatMessageVectorPayload,
): Promise<void> {
  const qdrantClient = getQdrantClient();

  await qdrantClient.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: messageId,
        vector,
        payload: payload as unknown as Record<string, unknown>,
      },
    ],
  });
}

export async function deleteByMessageId(messageId: string): Promise<void> {
  const qdrantClient = getQdrantClient();
  await qdrantClient.delete(COLLECTION_NAME, {
    wait: true,
    points: [messageId],
  });
}

export async function deleteByChatId(chatId: string): Promise<void> {
  const qdrantClient = getQdrantClient();
  await qdrantClient.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [{ key: "chat_id", match: { value: chatId } }],
    },
  });
}

export async function deleteByUserId(userId: string): Promise<void> {
  const qdrantClient = getQdrantClient();
  await qdrantClient.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [{ key: "user_id", match: { value: userId } }],
    },
  });
}

export async function searchSimilar(
  vector: number[],
  userId: string,
  options: {
    limit?: number;
    scoreThreshold?: number;
    chatId?: string;
    afterTimestamp?: string;
    beforeTimestamp?: string;
    role?: "user" | "assistant";
  } = {},
): Promise<SearchResult[]> {
  const qdrantClient = getQdrantClient();

  const {
    limit = 5,
    scoreThreshold = 0.7,
    chatId,
    afterTimestamp,
    beforeTimestamp,
    role,
  } = options;

  const must: Array<{
    key: string;
    match?: { value: string };
    range?: { gte?: string; lte?: string };
  }> = [{ key: "user_id", match: { value: userId } }];

  if (chatId) {
    must.push({ key: "chat_id", match: { value: chatId } });
  }

  if (afterTimestamp) {
    must.push({
      key: "timestamp",
      range: { gte: afterTimestamp },
    });
  }

  if (beforeTimestamp) {
    must.push({
      key: "timestamp",
      range: { lte: beforeTimestamp },
    });
  }

  if (role) {
    must.push({ key: "role", match: { value: role } });
  }

  const results = await qdrantClient.search(COLLECTION_NAME, {
    vector,
    limit,
    score_threshold: scoreThreshold,
    filter: { must },
    with_payload: true,
  });

  return results.map((r) => ({
    messageId: r.id as string,
    score: r.score ?? 0,
    payload: r.payload as unknown as ChatMessageVectorPayload,
  }));
}
