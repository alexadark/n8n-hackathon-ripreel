import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";

/**
 * Supabase client for server-side operations
 * Used for storage (images, videos, PDFs) - NOT for auth (demo mode)
 */
export function getStorageClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get a public URL for a storage path
 */
export function getPublicUrl(bucket: string, path: string): string {
  const client = getStorageClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob | ArrayBuffer,
  options?: { contentType?: string; upsert?: boolean }
) {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    publicUrl: getPublicUrl(bucket, data.path),
  };
}

/**
 * Download a file from a URL and upload to Supabase
 */
export async function downloadAndUpload(
  sourceUrl: string,
  bucket: string,
  path: string,
  contentType: string
) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download from ${sourceUrl}`);
  }

  const buffer = await response.arrayBuffer();
  return uploadFile(bucket, path, buffer, { contentType, upsert: true });
}
