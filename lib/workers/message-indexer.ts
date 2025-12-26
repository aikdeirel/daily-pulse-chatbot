import { createClient } from "redis";
import {
  extractTextFromParts,
  generateEmbedding,
} from "@/lib/services/embedding";
import { upsertMessageVector } from "@/lib/services/qdrant";

const QUEUE_NAME = "message-indexing-queue";

// Message payload for indexing queue
export interface IndexingJob {
  messageId: string;
  chatId: string;
  userId: string;
  role: "user" | "assistant";
  parts: unknown[];
}

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * Queue a message for async vector indexing
 * Called from chat route after message save
 */
export async function queueMessageForIndexing(job: IndexingJob): Promise<void> {
  const redis = await getRedisClient();
  await redis.lPush(QUEUE_NAME, JSON.stringify(job));
}

/**
 * Process a single indexing job
 */
async function processIndexingJob(job: IndexingJob): Promise<void> {
  const text = extractTextFromParts(job.parts);

  // Skip empty or very short messages
  if (!text || text.length < 10) {
    return;
  }

  const embedding = await generateEmbedding(text);

  await upsertMessageVector(job.messageId, embedding, {
    user_id: job.userId,
    chat_id: job.chatId,
    message_id: job.messageId,
    role: job.role,
    timestamp: new Date().toISOString(),
    content_preview: text.slice(0, 500),
  });
}

/**
 * Worker loop - poll queue and process jobs
 * Run as a separate process: npx tsx lib/workers/message-indexer.ts
 */
export async function startWorker(): Promise<void> {
  const redis = await getRedisClient();
  console.log("Message indexer worker started");

  while (true) {
    try {
      // Blocking pop with 5 second timeout
      const result = await redis.brPop(QUEUE_NAME, 5);

      if (result) {
        const job: IndexingJob = JSON.parse(result.element);
        await processIndexingJob(job);
        console.log(`Indexed message: ${job.messageId}`);
      }
    } catch (error) {
      console.error("Worker error:", error);
      // Wait before retrying on error
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Only start worker when run directly as a script
// Check if this is the main module being executed
const isMainModule = typeof require !== "undefined" && require.main === module;

if (isMainModule) {
  startWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
