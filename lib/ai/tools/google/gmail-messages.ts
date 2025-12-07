import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GmailMessagesToolProps = {
  userId: string;
};

export const gmailMessages = ({ userId }: GmailMessagesToolProps) =>
  tool({
    description: `Manage Gmail messages. Actions:
- "list_messages": List messages with optional search query and filters (supports q for search, labelIds for filtering, maxResults)
- "get_message": Get specific message details (requires messageId, optional format: full/metadata/minimal/raw)
- "search_messages": Search messages using Gmail query syntax (requires query string, examples: "from:user@example.com", "subject:meeting", "is:unread", "after:2024/01/01")
- "mark_read": Mark message as read (requires messageId)
- "mark_unread": Mark message as unread (requires messageId)
- "trash_message": Move message to trash (requires messageId)
- "untrash_message": Restore message from trash (requires messageId)

Important Notes:
- Use Gmail query syntax for search (from:, to:, subject:, has:attachment, is:unread, is:starred, after:, before:, newer_than:, older_than:)
- Common label IDs: INBOX, UNREAD, STARRED, IMPORTANT, SENT, DRAFT, SPAM, TRASH
- Requires Google OAuth connection with Gmail permissions.`,
    inputSchema: z.object({
      action: z.enum([
        "list_messages",
        "get_message",
        "search_messages",
        "mark_read",
        "mark_unread",
        "trash_message",
        "untrash_message",
      ]),
      messageId: z
        .string()
        .optional()
        .describe(
          "Message ID (required for get_message, mark_read, mark_unread, trash_message, untrash_message)",
        ),
      query: z
        .string()
        .optional()
        .describe(
          "Search query using Gmail syntax (required for search_messages, optional for list_messages)",
        ),
      labelIds: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by label IDs (e.g., ['INBOX', 'UNREAD']) for list_messages",
        ),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 20)"),
      format: z
        .enum(["full", "metadata", "minimal", "raw"])
        .optional()
        .describe(
          "Message format for get_message (default: full). Use 'metadata' for headers only, 'minimal' for IDs only.",
        ),
    }),
    execute: async ({
      action,
      messageId,
      query,
      labelIds,
      maxResults,
      format,
    }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_messages": {
            const messages = await googleService.listGmailMessages({
              q: query,
              labelIds,
              maxResults: maxResults || 20,
            });
            return { action: "list_messages", messages };
          }

          case "get_message": {
            if (!messageId) {
              return {
                error: "missing_message_id",
                message: "Message ID is required for get_message",
              };
            }
            const message = await googleService.getGmailMessage(
              messageId,
              format || "full",
            );
            return { action: "get_message", message };
          }

          case "search_messages": {
            if (!query) {
              return {
                error: "missing_query",
                message: "Search query is required for search_messages",
              };
            }
            const messages = await googleService.listGmailMessages({
              q: query,
              maxResults: maxResults || 20,
            });
            return { action: "search_messages", messages, query };
          }

          case "mark_read": {
            if (!messageId) {
              return {
                error: "missing_message_id",
                message: "Message ID is required for mark_read",
              };
            }
            const result = await googleService.modifyGmailMessage(
              messageId,
              undefined,
              ["UNREAD"],
            );
            return { action: "mark_read", result };
          }

          case "mark_unread": {
            if (!messageId) {
              return {
                error: "missing_message_id",
                message: "Message ID is required for mark_unread",
              };
            }
            const result = await googleService.modifyGmailMessage(
              messageId,
              ["UNREAD"],
              undefined,
            );
            return { action: "mark_unread", result };
          }

          case "trash_message": {
            if (!messageId) {
              return {
                error: "missing_message_id",
                message: "Message ID is required for trash_message",
              };
            }
            const result = await googleService.trashGmailMessage(messageId);
            return { action: "trash_message", result };
          }

          case "untrash_message": {
            if (!messageId) {
              return {
                error: "missing_message_id",
                message: "Message ID is required for untrash_message",
              };
            }
            const result = await googleService.untrashGmailMessage(messageId);
            return { action: "untrash_message", result };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Gmail Messages tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Gmail",
        };
      }
    },
  });
