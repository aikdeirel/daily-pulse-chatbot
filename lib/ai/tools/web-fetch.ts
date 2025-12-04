import { tool } from "ai";
import { z } from "zod";

export const webFetch = tool({
  description:
    "Fetch content from a specific URL (like curl). Not for web searching - only fetches one known URL. Returns JSON or text content.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch content from"),
    responseType: z
      .enum(["json", "text"])
      .default("json")
      .describe(
        "Expected response type: 'json' for JSON data, 'text' for plain text/HTML",
      ),
  }),
  execute: async ({ url, responseType = "json" }) => {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChatBot/1.0)",
          Accept:
            responseType === "json"
              ? "application/json"
              : "text/plain, text/html, */*",
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
        };
      }

      const contentType = response.headers.get("content-type") || "";

      if (responseType === "json" || contentType.includes("application/json")) {
        try {
          const data = await response.json();
          return {
            success: true,
            data,
            url,
            contentType,
          };
        } catch {
          // If JSON parsing fails, return as text
          const text = await response.text();
          return {
            success: true,
            data: text,
            url,
            contentType,
            note: "Response was not valid JSON, returned as text",
          };
        }
      }

      const text = await response.text();
      // Limit text response to prevent context overflow
      const truncatedText =
        text.length > 50000
          ? `${text.substring(0, 50000)}\n...[truncated]`
          : text;

      return {
        success: true,
        data: truncatedText,
        url,
        contentType,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        url,
      };
    }
  },
});
