import { tool } from "ai";
import { z } from "zod";
import { generateEmbedding } from "@/lib/services/embedding";
import { ensureCollection, searchSimilar } from "@/lib/services/qdrant";

interface SearchHistoryProps {
  userId: string;
}

export const searchPastConversations = ({ userId }: SearchHistoryProps) =>
  tool({
    description: `Search through your past conversations to find relevant context. 
Use this when the user references something they discussed before, or when you need 
to recall previous information. Results include conversation snippets with relevance scores.`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("Semantic search query - describe what you're looking for"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      timeRange: z
        .object({
          after: z
            .string()
            .optional()
            .describe("ISO 8601 timestamp - only search after this date"),
          before: z
            .string()
            .optional()
            .describe("ISO 8601 timestamp - only search before this date"),
        })
        .optional()
        .describe("Optional time range filter"),
      chatId: z
        .string()
        .optional()
        .describe("Limit search to a specific chat/conversation"),
      role: z
        .enum(["user", "assistant"])
        .optional()
        .describe("Filter results by message role (user or assistant)"),
    }),
    execute: async ({ query, limit = 5, timeRange, chatId, role }) => {
      try {
        // Ensure collection exists before searching
        await ensureCollection();

        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);

        // Search Qdrant
        const results = await searchSimilar(queryEmbedding, userId, {
          limit,
          chatId,
          afterTimestamp: timeRange?.after,
          beforeTimestamp: timeRange?.before,
          role,
          scoreThreshold: 0.65, // Filter low relevance
        });

        if (results.length === 0) {
          return {
            success: true,
            message: "No relevant past conversations found.",
            results: [],
          };
        }

        return {
          success: true,
          message: `Found ${results.length} relevant conversation(s).`,
          results: results.map((r) => ({
            content: r.payload.content_preview,
            chatId: r.payload.chat_id,
            timestamp: r.payload.timestamp,
            role: r.payload.role,
            relevanceScore: Math.round(r.score * 100) / 100,
          })),
        };
      } catch (error) {
        console.error("Search history error:", error);
        return {
          success: false,
          message: "Failed to search past conversations.",
          results: [],
        };
      }
    },
  });
