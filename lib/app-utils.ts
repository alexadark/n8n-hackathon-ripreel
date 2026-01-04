/** Client-safe constants used across the chat app */

export const IMAGE_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  MAX_FILES_PER_MESSAGE: 4,
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ] as readonly string[],
  BUCKET_NAME: "chat-images",
  CACHE_CONTROL: "3600",
  EXPIRATION_TIME: 24 * 60 * 60
} as const;
