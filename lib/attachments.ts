/**
 * Attachment processing utilities for chat messages
 * Handles conversion of different file types for LLM consumption
 */

import { isDocumentType, isImageType } from "./file-types";

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
 * Process attachments before sending to LLM
 * - Images are sent as-is with their URLs
 * - Text files are fetched and converted to text parts
 * - PDFs are sent as file attachments (model support may vary)
 */
export async function processAttachmentsForLLM(
  attachmentParts: AttachmentPart[],
): Promise<Array<AttachmentPart | TextPart>> {
  const processedParts: Array<AttachmentPart | TextPart> = [];

  for (const attachment of attachmentParts) {
    const { mediaType, url, name } = attachment;

    // Images: pass through as-is for vision models
    if (isImageType(mediaType)) {
      processedParts.push(attachment);
      continue;
    }

    // Text files: fetch content and convert to text
    if (mediaType === "text/plain" || mediaType === "text/markdown") {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const content = await response.text();
          processedParts.push({
            type: "text",
            text: `[Content of ${name}]:\n\n${content}`,
          });
          continue;
        }
      } catch (error) {
        console.error(`Failed to fetch text file ${name}:`, error);
        // Fall back to sending as attachment
      }
    }

    // PDFs and other documents: include as attachment
    // Note: Model support for PDFs varies. Some models may not support them.
    if (isDocumentType(mediaType)) {
      processedParts.push({
        ...attachment,
        // Keep as file attachment - the AI SDK will handle it appropriately
      });
      continue;
    }

    // Default: pass through as-is
    processedParts.push(attachment);
  }

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
    if (attachment.mediaType === "application/pdf") {
      unsupportedTypes.push("PDF");
    }
  }

  return {
    hasUnsupported: unsupportedTypes.length > 0,
    unsupportedTypes,
  };
}
