-- Custom SQL migration file, put your code below! --

-- Add model-specific prompt columns to project_locations
ALTER TABLE "project_locations" ADD COLUMN IF NOT EXISTS "prompt_seedream" text;
ALTER TABLE "project_locations" ADD COLUMN IF NOT EXISTS "prompt_nano_banana" text;

-- Add model-specific prompt columns to project_props
ALTER TABLE "project_props" ADD COLUMN IF NOT EXISTS "prompt_seedream" text;
ALTER TABLE "project_props" ADD COLUMN IF NOT EXISTS "prompt_nano_banana" text;