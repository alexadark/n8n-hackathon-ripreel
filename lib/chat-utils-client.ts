/**
 * Chat Utilities - Client-Safe Constants and Functions
 *
 * This file contains client-safe utilities that can be imported by both
 * server and client components without triggering server/client boundary violations.
 *
 * Server-side functions remain in chat-utils.ts
 */

import { IMAGE_UPLOAD_CONSTRAINTS } from "@/lib/app-utils";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImagePreview {
  id: string;
  file: File;
  preview: string;
  size: number;
  name: string;
  type: string;
  previewUrl: string; // The blob URL for client-side preview
  signedUrl?: string; // The actual signed URL after upload
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

// AI SDK experimental attachment types
export interface AISDKAttachment {
  name: string;
  contentType: string;
  url: string;
}

// Multimodal content types for AI SDK
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  image: string;
}

export type MultimodalContent = TextContent | ImageContent;

// =============================================================================
// CLIENT-SAFE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate an image file for upload
 * @param file - File to validate
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: "No file provided",
    };
  }

  // Check file type
  if (!IMAGE_UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Only JPEG and PNG images are supported",
    };
  }

  // Check file size
  if (file.size > IMAGE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${formatFileSize(IMAGE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE)}`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File appears to be empty",
    };
  }

  return { valid: true };
}

/**
 * Validate multiple image files
 * @param files - FileList or File array to validate
 */
export function validateImageFiles(files: FileList | File[]): {
  valid: File[];
  invalid: { file: File; error: string }[];
} {
  const fileArray = Array.from(files);
  const valid: File[] = [];
  const invalid: { file: File; error: string }[] = [];

  // Check total count
  if (fileArray.length > IMAGE_UPLOAD_CONSTRAINTS.MAX_FILES_PER_MESSAGE) {
    // Return error for all files if too many
    fileArray.forEach((file) => {
      invalid.push({
        file,
        error: `Maximum ${IMAGE_UPLOAD_CONSTRAINTS.MAX_FILES_PER_MESSAGE} images allowed per message`,
      });
    });
    return { valid, invalid };
  }

  // Validate each file
  fileArray.forEach((file) => {
    const result = validateImageFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error || "Invalid file" });
    }
  });

  return { valid, invalid };
}

/**
 * Create image preview objects for UI display
 * @param file - Valid image file
 */
export function createImagePreview(file: File): ImagePreview {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    file,
    preview: "",
    previewUrl: URL.createObjectURL(file),
    size: file.size,
    type: file.type,
    status: "pending",
  };
}

/**
 * Format file size in human readable format
 * @param bytes - File size in bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
