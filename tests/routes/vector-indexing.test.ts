import { getUser } from "@/lib/db/queries";
import { generateEmbedding } from "@/lib/services/embedding";
import { getQdrantClient, searchSimilar } from "@/lib/services/qdrant";
import { generateUUID } from "@/lib/utils";
import { expect, test } from "../fixtures";

const testUserMessage = {
  id: generateUUID(),
  role: "user" as const,
  parts: [
    {
      type: "text" as const,
      text: "What is the capital of France?",
    },
  ],
};

const testAssistantMessage = {
  id: generateUUID(),
  role: "assistant" as const,
  parts: [
    {
      type: "text" as const,
      text: "The capital of France is Paris.",
    },
  ],
};

test.describe
  .serial("/api/chat vector indexing", () => {
    test("User and assistant messages are indexed with correct role information", async ({
      adaContext,
    }) => {
      const chatId = generateUUID();

      // Get the user ID from the email
      const users = await getUser("test-ada-0@playwright.com");
      if (users.length === 0) {
        throw new Error("Test user not found");
      }
      const userId = users[0].id;

      // Send user message
      const userResponse = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: testUserMessage,
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });
      expect(userResponse.status()).toBe(200);

      // Wait for the assistant response to complete
      await userResponse.text();

      // Give some time for vector indexing to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify that the user message was indexed with correct role
      const userMessageEmbedding = await generateEmbedding(
        "What is the capital of France?",
      );
      const userSearchResults = await searchSimilar(
        userMessageEmbedding,
        userId,
        { limit: 1 },
      );

      expect(userSearchResults.length).toBeGreaterThan(0);
      expect(userSearchResults[0].payload.role).toBe("user");
      expect(userSearchResults[0].payload.content_preview).toContain(
        "capital of France",
      );

      // Verify that the assistant message was also indexed with correct role
      const assistantMessageEmbedding = await generateEmbedding(
        "The capital of France is Paris.",
      );
      const assistantSearchResults = await searchSimilar(
        assistantMessageEmbedding,
        userId,
        { limit: 1 },
      );

      expect(assistantSearchResults.length).toBeGreaterThan(0);
      expect(assistantSearchResults[0].payload.role).toBe("assistant");
      expect(assistantSearchResults[0].payload.content_preview).toContain(
        "Paris",
      );
    });

    test("Vector indexing includes both text and reasoning content for assistant messages", async ({
      adaContext,
    }) => {
      const chatId = generateUUID();

      // Get the user ID from the email
      const users = await getUser("test-ada-0@playwright.com");
      if (users.length === 0) {
        throw new Error("Test user not found");
      }
      const userId = users[0].id;

      // Send a message that will likely trigger reasoning
      const reasoningMessage = {
        id: generateUUID(),
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Explain the process of photosynthesis step by step.",
          },
        ],
      };

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: reasoningMessage,
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });
      expect(response.status()).toBe(200);

      // Wait for the response to complete
      await response.text();

      // Give time for vector indexing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Search for the assistant's response
      const searchEmbedding = await generateEmbedding("photosynthesis process");
      const searchResults = await searchSimilar(searchEmbedding, userId, {
        limit: 1,
      });

      expect(searchResults.length).toBeGreaterThan(0);
      const assistantResult = searchResults.find(
        (r) => r.payload.role === "assistant",
      );
      expect(assistantResult).toBeDefined();
      expect(assistantResult?.payload.content_preview.length).toBeGreaterThan(
        50,
      ); // Should contain substantial content
    });

    test("Role filtering works correctly in vector search", async ({
      adaContext,
    }) => {
      const chatId = generateUUID();

      // Get the user ID from the email
      const users = await getUser("test-ada-0@playwright.com");
      if (users.length === 0) {
        throw new Error("Test user not found");
      }
      const userId = users[0].id;

      // Send a test message
      const testMessage = {
        id: generateUUID(),
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Tell me about the history of artificial intelligence.",
          },
        ],
      };

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: testMessage,
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });
      expect(response.status()).toBe(200);

      // Wait for completion
      await response.text();

      // Give time for indexing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Search for AI-related content
      const searchEmbedding = await generateEmbedding(
        "artificial intelligence history",
      );
      const searchResults = await searchSimilar(searchEmbedding, userId, {
        limit: 5,
      });

      // Should find both user and assistant messages
      expect(searchResults.length).toBeGreaterThan(0);

      const userMessages = searchResults.filter(
        (r) => r.payload.role === "user",
      );
      const assistantMessages = searchResults.filter(
        (r) => r.payload.role === "assistant",
      );

      expect(userMessages.length).toBeGreaterThan(0);
      expect(assistantMessages.length).toBeGreaterThan(0);

      // Verify content is different based on role
      expect(userMessages[0].payload.content_preview).toContain(
        "history of artificial intelligence",
      );
      expect(assistantMessages[0].payload.content_preview).not.toContain(
        "history of artificial intelligence",
      );
    });
  });
