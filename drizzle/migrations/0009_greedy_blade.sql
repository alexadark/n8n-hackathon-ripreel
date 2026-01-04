ALTER TABLE "scene_videos" RENAME COLUMN "source_image_id" TO "source_variant_id";--> statement-breakpoint
ALTER TABLE "scene_videos" DROP CONSTRAINT "scene_videos_source_image_id_scene_images_id_fk";
--> statement-breakpoint
DROP INDEX "scene_video_source_image_id_idx";--> statement-breakpoint
ALTER TABLE "scene_videos" ADD CONSTRAINT "scene_videos_source_variant_id_scene_image_variants_id_fk" FOREIGN KEY ("source_variant_id") REFERENCES "public"."scene_image_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_video_source_variant_id_idx" ON "scene_videos" USING btree ("source_variant_id");