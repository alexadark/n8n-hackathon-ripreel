ALTER TABLE "project_characters" ADD COLUMN "portrait_prompt" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "portrait_image_url" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "portrait_storage_path" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "portrait_status" "bible_asset_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "portrait_n8n_job_id" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "three_quarter_prompt" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "three_quarter_image_url" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "three_quarter_storage_path" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "three_quarter_status" "bible_asset_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "three_quarter_n8n_job_id" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "full_body_prompt" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "full_body_image_url" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "full_body_storage_path" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "full_body_status" "bible_asset_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "full_body_n8n_job_id" text;--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "selected_model" text DEFAULT 'seedream-4.5-text-to-image';--> statement-breakpoint
ALTER TABLE "project_characters" ADD COLUMN "upload_source" jsonb;--> statement-breakpoint
ALTER TABLE "project_locations" ADD COLUMN "selected_model" text DEFAULT 'seedream-4.5-text-to-image';--> statement-breakpoint
ALTER TABLE "project_locations" ADD COLUMN "is_uploaded" jsonb;--> statement-breakpoint
ALTER TABLE "project_props" ADD COLUMN "selected_model" text DEFAULT 'seedream-4.5-text-to-image';--> statement-breakpoint
ALTER TABLE "project_props" ADD COLUMN "is_uploaded" jsonb;--> statement-breakpoint
CREATE INDEX "character_portrait_status_idx" ON "project_characters" USING btree ("portrait_status");--> statement-breakpoint
CREATE INDEX "character_three_quarter_status_idx" ON "project_characters" USING btree ("three_quarter_status");--> statement-breakpoint
CREATE INDEX "character_full_body_status_idx" ON "project_characters" USING btree ("full_body_status");