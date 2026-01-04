CREATE TYPE "public"."bible_asset_status" AS ENUM('pending', 'generating', 'ready', 'approved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."character_role" AS ENUM('lead', 'supporting', 'background');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('interior', 'exterior');--> statement-breakpoint
CREATE TYPE "public"."prop_importance" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TYPE "public"."project_status" ADD VALUE 'bible_review' BEFORE 'scene_validation';--> statement-breakpoint
CREATE TABLE "project_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" character_role DEFAULT 'supporting' NOT NULL,
	"visual_dna" text NOT NULL,
	"backstory" text,
	"approved_image_url" text,
	"approved_image_storage_path" text,
	"image_status" "bible_asset_status" DEFAULT 'pending' NOT NULL,
	"generation_prompt" text,
	"n8n_job_id" text,
	"error_message" text,
	"raw_data" jsonb,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "location_type" DEFAULT 'interior' NOT NULL,
	"visual_description" text NOT NULL,
	"time_variants" jsonb,
	"approved_image_url" text,
	"approved_image_storage_path" text,
	"image_status" "bible_asset_status" DEFAULT 'pending' NOT NULL,
	"generation_prompt" text,
	"n8n_job_id" text,
	"error_message" text,
	"raw_data" jsonb,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_props" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"importance" "prop_importance" DEFAULT 'medium' NOT NULL,
	"visual_description" text NOT NULL,
	"approved_image_url" text,
	"approved_image_storage_path" text,
	"image_status" "bible_asset_status" DEFAULT 'pending' NOT NULL,
	"generation_prompt" text,
	"n8n_job_id" text,
	"error_message" text,
	"raw_data" jsonb,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "raw_scene_data" jsonb;--> statement-breakpoint
ALTER TABLE "project_characters" ADD CONSTRAINT "project_characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_props" ADD CONSTRAINT "project_props_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_project_id_idx" ON "project_characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "character_image_status_idx" ON "project_characters" USING btree ("image_status");--> statement-breakpoint
CREATE INDEX "character_role_idx" ON "project_characters" USING btree ("role");--> statement-breakpoint
CREATE INDEX "location_project_id_idx" ON "project_locations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "location_image_status_idx" ON "project_locations" USING btree ("image_status");--> statement-breakpoint
CREATE INDEX "location_type_idx" ON "project_locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "prop_project_id_idx" ON "project_props" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "prop_image_status_idx" ON "project_props" USING btree ("image_status");--> statement-breakpoint
CREATE INDEX "prop_importance_idx" ON "project_props" USING btree ("importance");