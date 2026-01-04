import { z } from "zod";

/**
 * Server-side environment variables validation
 * This replaces @t3-oss/env-nextjs with plain Zod validation
 */
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Supabase (server-only, not exposed to browser)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // n8n Workflow Webhooks (all optional - only add what you use)
  N8N_PARSE_SCREENPLAY_WEBHOOK: z.string().url().optional(),
  N8N_IMAGE_GENERATION_WEBHOOK: z.string().url().optional(),
  N8N_GENERATE_BIBLE_WEBHOOK: z.string().url().optional(),
  N8N_GENERATE_SCENES_WEBHOOK: z.string().url().optional(),
  N8N_FLUX_ENHANCEMENT_WEBHOOK: z.string().url().optional(),
  N8N_VIDEO_GENERATION_WEBHOOK: z.string().url().optional(),
  N8N_SCENE_TO_SHOTS_WEBHOOK: z.string().url().optional(),
  N8N_VIDEO_GENERATION_SIMPLE_WEBHOOK: z.string().url().optional(),
  N8N_ASSEMBLY_WEBHOOK: z.string().url().optional(),
  N8N_VIDEO_TRIMMING_WEBHOOK: z.string().url().optional(),

  // FFmpeg API Service
  FFMPEG_API_URL: z.string().url().optional(),

  // AI Providers (optional)
  OPENROUTER_API_KEY: z.string().min(1).optional(),

  // App URL
  APP_URL: z.string().url().optional().default("http://localhost:5173"),
});

function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

export const env = getServerEnv();

export type ServerEnv = z.infer<typeof serverEnvSchema>;
