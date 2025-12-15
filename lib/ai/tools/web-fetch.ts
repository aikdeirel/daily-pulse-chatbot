import { tool } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { z } from "zod";

// Initialize TurndownService with configuration
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// Content extraction selectors in priority order
const CONTENT_SELECTORS = [
  "main",
  "article",
  '[role="main"]',
  ".content",
  "#content",
];

/**
 * Converts HTML to clean markdown by removing unnecessary elements and extracting main content
 */
function htmlToCleanMarkdown(html: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $(
    "script, style, nav, footer, header, aside, iframe, noscript, svg, form, button, input",
  ).remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $(".ads, .sidebar, .menu, .nav").remove();

  // Try to extract main content using priority selectors
  let content = "";
  for (const selector of CONTENT_SELECTORS) {
    content = $(selector).first().html() || "";
    if (content.trim()) {
      break;
    }
  }

  // Fall back to body if no main content found
  if (!content.trim()) {
    content = $("body").html() || "";
  }

  // Return empty string if no meaningful content
  if (!content.trim()) {
    return "";
  }

  // Convert to markdown
  return turndownService.turndown(content);
}

export const webFetch = tool({
  description:
    "Fetch content directly from a COMPLETE, SPECIFIC URL (API endpoint, specific webpage, or document). Requires the exact full URL to be known in advance. Example: 'https://api.example.com/users/123'. Cannot discover URLs or search the web. HTML responses are automatically converted to clean markdown.",
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
      const trimmedText = text.trim();

      // Detect if content is HTML more precisely
      const isHtml =
        contentType.includes("text/html") ||
        trimmedText.startsWith("<!DOCTYPE") ||
        trimmedText.startsWith("<!doctype") ||
        /^\s*<html[\s>]/i.test(trimmedText);

      // Convert HTML to markdown if detected
      const processedText = isHtml ? htmlToCleanMarkdown(text) : text;

      // Limit text response to prevent context overflow (markdown is more compact)
      const truncatedText =
        processedText.length > 15000
          ? `${processedText.substring(0, 15000)}\n...[truncated]`
          : processedText;

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
