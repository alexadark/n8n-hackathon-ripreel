-- Custom SQL migration file, put your code below! --
-- Add YouTube URL and ID columns to final_reels table for storing both
-- the direct MP4 download link (video_url) and YouTube unlisted video info

ALTER TABLE "final_reels" ADD COLUMN IF NOT EXISTS "youtube_url" text;
ALTER TABLE "final_reels" ADD COLUMN IF NOT EXISTS "youtube_id" text;

-- Add comment for clarity
COMMENT ON COLUMN "final_reels"."video_url" IS 'Direct MP4 download URL from FFmpeg API';
COMMENT ON COLUMN "final_reels"."youtube_url" IS 'YouTube unlisted video URL for embedding/sharing';
COMMENT ON COLUMN "final_reels"."youtube_id" IS 'YouTube video ID for embed player';
