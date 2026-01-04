import { getStorageClient } from "./storage-client.server";

/**
 * Demo mode Supabase client
 * Uses service role key for storage operations (no auth)
 */
export async function createClient() {
  return getStorageClient();
}
