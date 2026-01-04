CREATE TYPE "public"."asset_status" AS ENUM('generating', 'ready', 'approved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."audio_type" AS ENUM('voiceover', 'sfx', 'music');--> statement-breakpoint
CREATE TYPE "public"."image_generation_method" AS ENUM('auto_generate', 'upload', 'midjourney_import');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('parsing', 'scene_validation', 'asset_generation', 'timeline_review', 'final_review', 'assembling', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reel_status" AS ENUM('assembling', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."scene_validation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visual_style" AS ENUM('neo-noir', 'sci-fi', 'drama', 'horror', 'comedy', 'thriller', 'romance');--> statement-breakpoint
CREATE TABLE "final_reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"video_storage_path" text,
	"video_url" text,
	"duration_seconds" integer,
	"file_size_bytes" bigint,
	"resolution" text,
	"status" "reel_status" DEFAULT 'assembling' NOT NULL,
	"n8n_job_id" text,
	"assembly_progress" jsonb,
	"approved_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"screenplay_filename" text NOT NULL,
	"screenplay_storage_path" text NOT NULL,
	"visual_style" "visual_style" NOT NULL,
	"style_locked" boolean DEFAULT false NOT NULL,
	"status" "project_status" DEFAULT 'parsing' NOT NULL,
	"n8n_parse_job_id" text,
	"total_duration_seconds" integer,
	"scene_order" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scene_number" integer NOT NULL,
	"slugline" text NOT NULL,
	"action_text" text NOT NULL,
	"characters" text[],
	"validation_status" "scene_validation_status" DEFAULT 'pending' NOT NULL,
	"user_edits" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"generation_method" "image_generation_method" NOT NULL,
	"image_storage_path" text,
	"image_url" text,
	"status" "asset_status" DEFAULT 'generating' NOT NULL,
	"n8n_job_id" text,
	"generation_prompt" text,
	"midjourney_prompt" text,
	"refinement_feedback" text,
	"refinement_iteration" integer DEFAULT 0 NOT NULL,
	"parent_image_id" uuid,
	"approved_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"source_image_id" uuid NOT NULL,
	"video_storage_path" text,
	"video_url" text,
	"duration_seconds" integer,
	"status" "asset_status" DEFAULT 'generating' NOT NULL,
	"n8n_job_id" text,
	"approved_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"audio_type" "audio_type" NOT NULL,
	"audio_storage_path" text,
	"audio_url" text,
	"duration_seconds" integer,
	"status" "asset_status" DEFAULT 'generating' NOT NULL,
	"n8n_job_id" text,
	"genre_preset" text,
	"approved_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"share_id" text NOT NULL,
	"title" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "share_links_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
ALTER TABLE "final_reels" ADD CONSTRAINT "final_reels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_images" ADD CONSTRAINT "scene_images_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_images" ADD CONSTRAINT "scene_images_parent_image_id_scene_images_id_fk" FOREIGN KEY ("parent_image_id") REFERENCES "public"."scene_images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_videos" ADD CONSTRAINT "scene_videos_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_videos" ADD CONSTRAINT "scene_videos_source_image_id_scene_images_id_fk" FOREIGN KEY ("source_image_id") REFERENCES "public"."scene_images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_audio" ADD CONSTRAINT "scene_audio_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "final_reel_project_id_idx" ON "final_reels" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "final_reel_status_idx" ON "final_reels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scene_project_id_idx" ON "scenes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scene_validation_status_idx" ON "scenes" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "scene_number_idx" ON "scenes" USING btree ("scene_number");--> statement-breakpoint
CREATE INDEX "scene_image_scene_id_idx" ON "scene_images" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_image_status_idx" ON "scene_images" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scene_image_approved_at_idx" ON "scene_images" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "scene_video_scene_id_idx" ON "scene_videos" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_video_status_idx" ON "scene_videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scene_video_source_image_id_idx" ON "scene_videos" USING btree ("source_image_id");--> statement-breakpoint
CREATE INDEX "scene_audio_scene_id_idx" ON "scene_audio" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_audio_type_idx" ON "scene_audio" USING btree ("audio_type");--> statement-breakpoint
CREATE INDEX "scene_audio_status_idx" ON "scene_audio" USING btree ("status");--> statement-breakpoint
CREATE INDEX "share_link_share_id_idx" ON "share_links" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "share_link_project_id_idx" ON "share_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "share_link_is_active_idx" ON "share_links" USING btree ("is_active");