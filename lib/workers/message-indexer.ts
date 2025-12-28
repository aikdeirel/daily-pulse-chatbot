import { createClient } from "redis";
import {
  extractTextFromParts,
  generateEmbedding,
} from "@/lib/services/embedding";
import { ensureCollection, upsertMessageVector } from "@/lib/services/qdrant";

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
 * Check if async worker mode is enabled via env variable
 * VECTOR_INDEX_MODE=async uses Redis queue + worker
 * Default (not set or any other value) uses synchronous indexing
 */
export function isAsyncIndexingEnabled(): boolean {
  return process.env.VECTOR_INDEX_MODE === "async";
}

/**
 * Queue a message for async vector indexing (worker mode)
 * Called from chat route after message save when VECTOR_INDEX_MODE=async
 */
export async function queueMessageForIndexing(job: IndexingJob): Promise<void> {
  const redis = await getRedisClient();
  await redis.lPush(QUEUE_NAME, JSON.stringify(job));
}

/**
 * Index a message synchronously (serverless mode - default)
 * Called from chat route when VECTOR_INDEX_MODE is not set or not "async"
 */
export async function indexMessageSync(job: IndexingJob): Promise<void> {
  await processIndexingJob(job);
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

  // Ensure collection exists before upserting
  await ensureCollection();

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

// Export functions for use by other modules
// To start the worker as a standalone process, run:
// npx tsx lib/workers/message-indexer.ts --start-worker
if (process.argv.includes("--start-worker")) {
  startWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
