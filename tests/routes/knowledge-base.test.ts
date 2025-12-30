import type { KnowledgeBase } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";
import { expect, test } from "../fixtures";

const entriesCreatedByAda: KnowledgeBase[] = [];

test.describe
  .serial("/api/knowledge-base", () => {
    test("Ada can retrieve empty knowledge base entries", async ({
      adaContext,
    }) => {
      const response = await adaContext.request.get("/api/knowledge-base");
      expect(response.status()).toBe(200);

      const entries = await response.json();
      expect(Array.isArray(entries)).toBe(true);
    });

    test("Ada cannot create entry without content", async ({ adaContext }) => {
      const response = await adaContext.request.post("/api/knowledge-base", {
        data: {},
      });
      expect(response.status()).toBe(400);

      const { code } = await response.json();
      expect(code).toEqual("bad_request:api");
    });

    test("Ada cannot create entry with empty content", async ({
      adaContext,
    }) => {
      const response = await adaContext.request.post("/api/knowledge-base", {
        data: { content: "   " },
      });
      expect(response.status()).toBe(400);

      const { code } = await response.json();
      expect(code).toEqual("bad_request:api");
    });

    test("Ada can create a knowledge base entry", async ({ adaContext }) => {
      const content = "I love **Blade Runner**, especially the visual style.";

      const response = await adaContext.request.post("/api/knowledge-base", {
        data: { content },
      });
      expect(response.status()).toBe(201);

      const entry = await response.json();
      expect(entry.content).toEqual(content);
      expect(entry.id).toBeDefined();
      expect(entry.createdAt).toBeDefined();
      expect(entry.updatedAt).toBeDefined();

      entriesCreatedByAda.push(entry);
    });

    test("Ada can create another knowledge base entry", async ({
      adaContext,
    }) => {
      const content =
        "Currently developing a React-based chatbot app.\n\nStack: React, Node.js, PostgreSQL.";

      const response = await adaContext.request.post("/api/knowledge-base", {
        data: { content },
      });
      expect(response.status()).toBe(201);

      const entry = await response.json();
      expect(entry.content).toEqual(content);

      entriesCreatedByAda.push(entry);
    });

    test("Ada can retrieve her knowledge base entries (newest first)", async ({
      adaContext,
    }) => {
      const response = await adaContext.request.get("/api/knowledge-base");
      expect(response.status()).toBe(200);

      const entries = await response.json();
      expect(entries.length).toBeGreaterThanOrEqual(2);

      // Verify newest entry is first
      const [newest] = entries;
      expect(newest.id).toEqual(entriesCreatedByAda[1].id);
    });

    test("Ada cannot update entry without id", async ({ adaContext }) => {
      const response = await adaContext.request.put("/api/knowledge-base", {
        data: { content: "Updated content" },
      });
      expect(response.status()).toBe(400);

      const { code } = await response.json();
      expect(code).toEqual("bad_request:api");
    });

    test("Ada cannot update non-existent entry", async ({ adaContext }) => {
      const fakeId = generateUUID();

      const response = await adaContext.request.put(
        `/api/knowledge-base?id=${fakeId}`,
        {
          data: { content: "Updated content" },
        },
      );
      expect(response.status()).toBe(404);
    });

    test("Ada can update her knowledge base entry", async ({ adaContext }) => {
      const [firstEntry] = entriesCreatedByAda;
      const newContent =
        "I love **Blade Runner** and **Blade Runner 2049**, especially the visual style and soundtrack.";

      const response = await adaContext.request.put(
        `/api/knowledge-base?id=${firstEntry.id}`,
        {
          data: { content: newContent },
        },
      );
      expect(response.status()).toBe(200);

      const updatedEntry = await response.json();
      expect(updatedEntry.content).toEqual(newContent);
      expect(updatedEntry.id).toEqual(firstEntry.id);

      // Update tracked entry
      entriesCreatedByAda[0] = updatedEntry;
    });

    test("Ada cannot delete entry without id", async ({ adaContext }) => {
      const response = await adaContext.request.delete("/api/knowledge-base");
      expect(response.status()).toBe(400);

      const { code } = await response.json();
      expect(code).toEqual("bad_request:api");
    });

    test("Ada cannot delete non-existent entry", async ({ adaContext }) => {
      const fakeId = generateUUID();

      const response = await adaContext.request.delete(
        `/api/knowledge-base?id=${fakeId}`,
      );
      expect(response.status()).toBe(404);
    });

    test("Ada can delete her knowledge base entry", async ({ adaContext }) => {
      const [firstEntry] = entriesCreatedByAda;

      const response = await adaContext.request.delete(
        `/api/knowledge-base?id=${firstEntry.id}`,
      );
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
    });

    test("Ada cannot access deleted entry", async ({ adaContext }) => {
      const [firstEntry] = entriesCreatedByAda;

      // Try to update the deleted entry
      const response = await adaContext.request.put(
        `/api/knowledge-base?id=${firstEntry.id}`,
        {
          data: { content: "Should fail" },
        },
      );
      expect(response.status()).toBe(404);
    });

    test("Babbage cannot access Ada's knowledge base entries directly", async ({
      adaContext,
      babbageContext,
    }) => {
      // Ada creates a new entry
      const response = await adaContext.request.post("/api/knowledge-base", {
        data: { content: "Ada's private note" },
      });
      expect(response.status()).toBe(201);
      const adaEntry = await response.json();

      // Babbage tries to update Ada's entry
      const updateResponse = await babbageContext.request.put(
        `/api/knowledge-base?id=${adaEntry.id}`,
        {
          data: { content: "Hacked by Babbage" },
        },
      );
      expect(updateResponse.status()).toBe(404);

      // Babbage tries to delete Ada's entry
      const deleteResponse = await babbageContext.request.delete(
        `/api/knowledge-base?id=${adaEntry.id}`,
      );
      expect(deleteResponse.status()).toBe(404);

      // Clean up - Ada deletes her entry
      await adaContext.request.delete(`/api/knowledge-base?id=${adaEntry.id}`);
    });
  });
