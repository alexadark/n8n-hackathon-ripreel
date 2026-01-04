import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { audioTypeEnum, assetStatusEnum } from "./enums";
import { scenes } from "./scenes";
import type { InferSelectModel } from "drizzle-orm";

export const scene_audio = pgTable(
  "scene_audio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scene_id: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    audio_type: audioTypeEnum("audio_type").notNull(),
    audio_storage_path: text("audio_storage_path"),
    audio_url: text("audio_url"),
    duration_seconds: integer("duration_seconds"),
    status: assetStatusEnum("status").default("generating").notNull(),
    n8n_job_id: text("n8n_job_id"),
    genre_preset: text("genre_preset"),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("scene_audio_scene_id_idx").on(t.scene_id),
    index("scene_audio_type_idx").on(t.audio_type),
    index("scene_audio_status_idx").on(t.status),
  ]
);

export type SceneAudio = InferSelectModel<typeof scene_audio>;
export type NewSceneAudio = typeof scene_audio.$inferInsert;




