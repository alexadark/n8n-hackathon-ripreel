import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";

export const createSupabaseServerAdminClient = () => {
  // This client bypasses RLS and should only be used in secure server-side environments for admin tasks.
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};
