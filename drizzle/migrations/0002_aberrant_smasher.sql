CREATE TABLE "scene_shots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"shot_number" integer NOT NULL,
	"duration_estimate" integer NOT NULL,
	"shot_description" text NOT NULL,
	"shot_type" text,
	"camera_angle" text,
	"camera_movement" text,
	"image_generation_prompt" text NOT NULL,
	"full_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scene_images" ADD COLUMN "generation_phase" text;--> statement-breakpoint
ALTER TABLE "scene_shots" ADD CONSTRAINT "scene_shots_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_shot_scene_id_idx" ON "scene_shots" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_shot_number_idx" ON "scene_shots" USING btree ("shot_number");