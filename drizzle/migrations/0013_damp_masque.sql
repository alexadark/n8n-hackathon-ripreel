-- MVP Simplification Migration
-- 1. Add auto_mode to projects
-- 2. Drop three_quarter and full_body columns from project_characters (keep portrait only)
-- 3. Drop unused indexes

-- 1. Add auto_mode column to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "auto_mode" boolean DEFAULT false NOT NULL;

-- 2. Drop three_quarter columns from project_characters
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_prompt_seedream";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_prompt_nano_banana";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_prompt";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_image_url";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_storage_path";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_status";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "three_quarter_n8n_job_id";

-- 3. Drop full_body columns from project_characters
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_prompt_seedream";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_prompt_nano_banana";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_prompt";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_image_url";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_storage_path";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_status";
ALTER TABLE "project_characters" DROP COLUMN IF EXISTS "full_body_n8n_job_id";

-- 4. Drop unused indexes (if they exist)
DROP INDEX IF EXISTS "character_three_quarter_status_idx";
DROP INDEX IF EXISTS "character_full_body_status_idx";
