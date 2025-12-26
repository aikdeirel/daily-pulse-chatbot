/**
 * Type definitions for vector database operations
 */

export interface ChatMessageVectorPoint {
  id: string; // Use message UUID from PostgreSQL
  vector: number[]; // 1536 dimensions for text-embedding-3-small
  payload: ChatMessageVectorPayload;
}

export interface ChatMessageVectorPayload {
  // Required - for isolation
  user_id: string;

  // Required - for grouping
  chat_id: string;
  message_id: string;

  // Required - for filtering
  timestamp: string; // ISO 8601
  role: "user" | "assistant";

  // Required - for display
  content_preview: string; // First 500 chars of text content

  // Optional - for enhanced filtering
  topics?: string[];
  has_tool_calls?: boolean;
}

export interface SearchResult {
  messageId: string;
  score: number;
  payload: ChatMessageVectorPayload;
}
