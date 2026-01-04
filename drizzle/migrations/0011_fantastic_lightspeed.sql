-- Custom SQL migration: Add character tier and model-specific prompts
-- This adds support for the new character classification system:
-- - main: Full Bible (3 shots)
-- - supporting: Bible (portrait only)
-- - extra: NO Bible (inline description in scenes)

-- Create character_tier enum
DO $$ BEGIN
    CREATE TYPE "character_tier" AS ENUM('main', 'supporting', 'extra');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to project_characters table
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "tier" "character_tier" NOT NULL DEFAULT 'supporting';
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "scene_count" integer DEFAULT 1;

-- Add model-specific prompt columns for portrait
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "portrait_prompt_seedream" text;
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "portrait_prompt_nano_banana" text;

-- Add model-specific prompt columns for three-quarter
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "three_quarter_prompt_seedream" text;
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "three_quarter_prompt_nano_banana" text;

-- Add model-specific prompt columns for full body
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "full_body_prompt_seedream" text;
ALTER TABLE "project_characters" ADD COLUMN IF NOT EXISTS "full_body_prompt_nano_banana" text;

-- Create index on tier column
CREATE INDEX IF NOT EXISTS "character_tier_idx" ON "project_characters" ("tier");
