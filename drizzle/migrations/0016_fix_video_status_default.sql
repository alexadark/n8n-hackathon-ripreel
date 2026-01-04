-- Custom SQL migration file, put your code below! --

-- Fix: Remove default 'generating' value from video_status column
-- Shots should start with NULL (pending) until user explicitly triggers video generation
ALTER TABLE "scene_shots" ALTER COLUMN "video_status" DROP DEFAULT;

-- Reset existing shots stuck in 'generating' to NULL (pending)
-- This allows users to properly review and then manually trigger generation
UPDATE "scene_shots"
SET "video_status" = NULL, "updated_at" = NOW()
WHERE "video_status" = 'generating'
  AND "video_url" IS NULL;
