import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { assetStatusEnum } from "./enums";
import { scenes } from "./scenes";
import { sceneImageVariants } from "./scene_image_variants";
import type { InferSelectModel } from "drizzle-orm";

export const scene_videos = pgTable(
  "scene_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scene_id: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    source_variant_id: uuid("source_variant_id")
      .notNull()
      .references(() => sceneImageVariants.id),
    video_storage_path: text("video_storage_path"),
    video_url: text("video_url"),
    duration_seconds: integer("duration_seconds"),
    status: assetStatusEnum("status").default("generating").notNull(),
    n8n_job_id: text("n8n_job_id"),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("scene_video_scene_id_idx").on(t.scene_id),
    index("scene_video_status_idx").on(t.status),
    index("scene_video_source_variant_id_idx").on(t.source_variant_id),
  ]
);

export type SceneVideo = InferSelectModel<typeof scene_videos>;
export type NewSceneVideo = typeof scene_videos.$inferInsert;




