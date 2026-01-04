CREATE TABLE "scene_image_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"storage_path" text DEFAULT '' NOT NULL,
	"model" text NOT NULL,
	"prompt" text,
	"injected_characters" jsonb,
	"injected_locations" jsonb,
	"injected_props" jsonb,
	"status" text DEFAULT 'generating' NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"generation_order" integer DEFAULT 0,
	"n8n_job_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scene_images" ALTER COLUMN "generation_method" SET DATA TYPE text;--> statement-breakpoint
-- Update existing data to use underscore instead of hyphen
UPDATE "scene_images" SET "generation_method" = 'auto_generate' WHERE "generation_method" = 'auto-generate';--> statement-breakpoint
DROP TYPE "public"."image_generation_method";--> statement-breakpoint
CREATE TYPE "public"."image_generation_method" AS ENUM('auto_generate', 'upload');--> statement-breakpoint
ALTER TABLE "scene_images" ALTER COLUMN "generation_method" SET DATA TYPE "public"."image_generation_method" USING "generation_method"::"public"."image_generation_method";--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "approved_image_id" uuid;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "approved_image_url" text;--> statement-breakpoint
ALTER TABLE "scene_image_variants" ADD CONSTRAINT "scene_image_variants_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_image_variant_scene_id_idx" ON "scene_image_variants" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_image_variant_status_idx" ON "scene_image_variants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scene_image_variant_is_selected_idx" ON "scene_image_variants" USING btree ("is_selected");--> statement-breakpoint
ALTER TABLE "scene_images" DROP COLUMN "midjourney_prompt";