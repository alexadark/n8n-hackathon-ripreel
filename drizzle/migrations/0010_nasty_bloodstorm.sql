-- Custom SQL migration: Recreate scene_shots table for Veo 3.1 support
-- This drops the old table and creates a new one with shot-based video generation fields

-- Drop old table and recreate with new schema for Veo 3.1 support
DROP TABLE IF EXISTS "scene_shots" CASCADE;

-- Create new scene_shots table for Veo 3.1 video generation
CREATE TABLE "scene_shots" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "scene_id" uuid NOT NULL REFERENCES "scenes"("id") ON DELETE CASCADE,

    -- Shot metadata from n8n workflow
    "shot_number" integer NOT NULL,
    "shot_duration_seconds" integer NOT NULL DEFAULT 8,
    "is_first_shot" boolean NOT NULL DEFAULT true,
    "shot_type" text,

    -- Prompts from n8n workflow
    "composition_instruction" text,
    "action_prompt" text NOT NULL,
    "end_frame_instruction" text,
    "dialogue_segment" text,

    -- Start frame image generation
    "start_frame_image_url" text,
    "start_frame_storage_path" text,
    "start_frame_status" "asset_status",

    -- End frame image generation (optional)
    "end_frame_image_url" text,
    "end_frame_storage_path" text,
    "end_frame_status" "asset_status",

    -- Video generation
    "video_url" text,
    "video_storage_path" text,
    "video_status" "asset_status" DEFAULT 'generating',

    -- Veo 3.1 specific fields
    "veo_task_id" text,
    "previous_shot_id" uuid,
    "uses_extend" boolean NOT NULL DEFAULT false,

    -- n8n job tracking
    "start_frame_job_id" text,
    "end_frame_job_id" text,
    "video_job_id" text,

    -- Error tracking
    "error_message" text,

    -- Timestamps
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX "scene_shot_scene_id_idx" ON "scene_shots" USING btree ("scene_id");
CREATE INDEX "scene_shot_number_idx" ON "scene_shots" USING btree ("scene_id", "shot_number");
CREATE INDEX "scene_shot_video_status_idx" ON "scene_shots" USING btree ("video_status");
CREATE INDEX "scene_shot_veo_task_id_idx" ON "scene_shots" USING btree ("veo_task_id");
