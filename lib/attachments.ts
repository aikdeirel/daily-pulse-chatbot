/**
 * Attachment processing utilities for chat messages
 * Handles conversion of different file types for LLM consumption
 */

import { ALLOWED_FILE_TYPES, isImageType } from "./file-types";

export interface AttachmentPart {
  type: "file";
  url: string;
  name: string;
  mediaType: string;
}

export interface TextPart {
  type: "text";
  text: string;
}

/**
 * Validate that a URL is from a trusted Vercel Blob storage domain
 * Prevents SSRF attacks by ensuring we only fetch from expected sources
 */
function isVercelBlobUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Process attachments before sending to LLM
 * - Images are sent as-is with their URLs
 * - Text files are fetched and converted to text parts
 * - PDFs are sent as file attachments (model support may vary)
 */
export async function processAttachmentsForLLM(
  attachmentParts: AttachmentPart[],
): Promise<Array<AttachmentPart | TextPart>> {
  // Process all attachments in parallel for better performance
  const processedParts = await Promise.all(
    attachmentParts.map(async (attachment) => {
      const { mediaType, url, name } = attachment;

      // Images: pass through as-is for vision models
      if (isImageType(mediaType)) {
        return attachment;
      }

      // Text files: fetch content and convert to text
      if (
        mediaType === ALLOWED_FILE_TYPES.TEXT_PLAIN ||
        mediaType === ALLOWED_FILE_TYPES.TEXT_MARKDOWN
      ) {
        // Validate URL to prevent SSRF
        if (!isVercelBlobUrl(url)) {
          console.error(`Untrusted URL detected for ${name}: ${url}`);
          return attachment; // Fall back to sending as attachment
        }

        try {
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            return {
              type: "text" as const,
              text: `[Content of ${name}]:\n\n${content}`,
            };
          }
          // Non-ok response, fall back to attachment
          console.error(
            `Failed to fetch text file ${name}: response not ok (${response.status})`,
          );
          return attachment;
        } catch (error) {
          console.error(`Failed to fetch text file ${name}:`, error);
          // Fall back to sending as attachment
          return attachment;
        }
      }

      // PDFs: include as attachment
      // Note: Model support for PDFs varies. Some models may not support them.
      if (mediaType === ALLOWED_FILE_TYPES.APPLICATION_PDF) {
        return attachment;
      }

      // Default: pass through as-is
      return attachment;
    }),
  );

  return processedParts;
}

/**
 * Check if any attachment is a type that might not be supported by the model
 */
export function hasUnsupportedAttachments(attachmentParts: AttachmentPart[]): {
  hasUnsupported: boolean;
  unsupportedTypes: string[];
} {
  const unsupportedTypes: string[] = [];

  for (const attachment of attachmentParts) {
    // PDFs may not be supported by all models
    if (attachment.mediaType === ALLOWED_FILE_TYPES.APPLICATION_PDF) {
      unsupportedTypes.push("PDF");
    }
  }

  return {
    hasUnsupported: unsupportedTypes.length > 0,
    unsupportedTypes,
  };
}
