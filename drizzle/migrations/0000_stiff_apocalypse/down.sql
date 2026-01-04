-- Down Migration: Complete Schema Replacement Rollback
-- Created: 2025-12-06
-- Migration: 0000_stiff_apocalypse
-- Purpose: Safely rollback film production schema to empty state

-- ⚠️ WARNING: This will delete ALL film production data
-- This down migration drops all 7 production tables and 7 enums
-- Only run this if you need to completely rollback the schema replacement

-- Step 1: Drop all indexes (safe to drop, will be recreated if needed)
DROP INDEX IF EXISTS "share_link_is_active_idx";
DROP INDEX IF EXISTS "share_link_project_id_idx";
DROP INDEX IF EXISTS "share_link_share_id_idx";
DROP INDEX IF EXISTS "scene_audio_status_idx";
DROP INDEX IF EXISTS "scene_audio_type_idx";
DROP INDEX IF EXISTS "scene_audio_scene_id_idx";
DROP INDEX IF EXISTS "scene_video_source_image_id_idx";
DROP INDEX IF EXISTS "scene_video_status_idx";
DROP INDEX IF EXISTS "scene_video_scene_id_idx";
DROP INDEX IF EXISTS "scene_image_approved_at_idx";
DROP INDEX IF EXISTS "scene_image_status_idx";
DROP INDEX IF EXISTS "scene_image_scene_id_idx";
DROP INDEX IF EXISTS "scene_number_idx";
DROP INDEX IF EXISTS "scene_validation_status_idx";
DROP INDEX IF EXISTS "scene_project_id_idx";
DROP INDEX IF EXISTS "project_created_at_idx";
DROP INDEX IF EXISTS "project_status_idx";
DROP INDEX IF EXISTS "final_reel_status_idx";
DROP INDEX IF EXISTS "final_reel_project_id_idx";

-- Step 2: Drop all foreign key constraints
-- Note: Foreign keys are named by Drizzle, dropping tables with CASCADE will handle this

-- Step 3: Drop all tables in reverse dependency order (CASCADE ensures clean removal)
DROP TABLE IF EXISTS "share_links" CASCADE;
DROP TABLE IF EXISTS "scene_audio" CASCADE;
DROP TABLE IF EXISTS "scene_videos" CASCADE;
DROP TABLE IF EXISTS "scene_images" CASCADE;
DROP TABLE IF EXISTS "final_reels" CASCADE;
DROP TABLE IF EXISTS "scenes" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;

-- Step 4: Drop all enums (safe with IF EXISTS)
DROP TYPE IF EXISTS "visual_style";
DROP TYPE IF EXISTS "scene_validation_status";
DROP TYPE IF EXISTS "reel_status";
DROP TYPE IF EXISTS "project_status";
DROP TYPE IF EXISTS "image_generation_method";
DROP TYPE IF EXISTS "audio_type";
DROP TYPE IF EXISTS "asset_status";

-- ✅ Down migration complete
-- All film production schema removed
-- Database is now in pre-migration state (empty)




