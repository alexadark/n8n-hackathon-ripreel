CREATE TABLE "bible_image_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"shot_type" text,
	"image_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text,
	"status" text DEFAULT 'generating' NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"generation_order" integer DEFAULT 0,
	"n8n_job_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
