/**
 * File type validation and utilities for file uploads
 * Centralizes file type handling for better maintainability
 */

export const ALLOWED_FILE_TYPES = {
  IMAGE_JPEG: "image/jpeg",
  IMAGE_PNG: "image/png",
  APPLICATION_PDF: "application/pdf",
  TEXT_PLAIN: "text/plain",
  TEXT_MARKDOWN: "text/markdown",
} as const;

export type AllowedFileType =
  (typeof ALLOWED_FILE_TYPES)[keyof typeof ALLOWED_FILE_TYPES];

export const ALLOWED_FILE_TYPES_ARRAY: AllowedFileType[] =
  Object.values(ALLOWED_FILE_TYPES);

/**
 * Accept attribute value for file input element
 * Includes all allowed file types and common markdown extensions
 */
export const FILE_INPUT_ACCEPT =
  "image/jpeg,image/png,application/pdf,text/plain,text/markdown,.md,.txt";

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Check if a file type is an image
 */
export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

/**
 * Check if a file type is a document (PDF, text, markdown)
 */
export function isDocumentType(type: string): boolean {
  return (
    type === ALLOWED_FILE_TYPES.APPLICATION_PDF ||
    type === ALLOWED_FILE_TYPES.TEXT_PLAIN ||
    type === ALLOWED_FILE_TYPES.TEXT_MARKDOWN
  );
}

/**
 * Check if a file type is allowed
 */
export function isAllowedFileType(type: string): boolean {
  return ALLOWED_FILE_TYPES_ARRAY.includes(type as AllowedFileType);
}

/**
 * Get a human-readable error message for invalid file types
 */
export function getFileTypeErrorMessage(): string {
  return "File type should be JPEG, PNG, PDF, text, or markdown";
}

/**
 * Get a human-readable label for a file type
 */
export function getFileTypeLabel(type: string): string {
  if (type === ALLOWED_FILE_TYPES.IMAGE_JPEG) return "JPEG";
  if (type === ALLOWED_FILE_TYPES.IMAGE_PNG) return "PNG";
  if (type === ALLOWED_FILE_TYPES.APPLICATION_PDF) return "PDF";
  if (type === ALLOWED_FILE_TYPES.TEXT_PLAIN) return "Text";
  if (type === ALLOWED_FILE_TYPES.TEXT_MARKDOWN) return "Markdown";
  return "File";
}
