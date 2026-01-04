import { pgTable, uuid, text, integer, bigint, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { reelStatusEnum } from "./enums";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

export const final_reels = pgTable(
  "final_reels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    video_storage_path: text("video_storage_path"),
    video_url: text("video_url"), // Direct MP4 download URL from FFmpeg API
    youtube_url: text("youtube_url"), // YouTube unlisted video URL
    youtube_id: text("youtube_id"), // YouTube video ID for embedding
    duration_seconds: integer("duration_seconds"),
    file_size_bytes: bigint("file_size_bytes", { mode: "number" }),
    resolution: text("resolution"),
    status: reelStatusEnum("status").default("assembling").notNull(),
    n8n_job_id: text("n8n_job_id"),
    assembly_progress: jsonb("assembly_progress"),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("final_reel_project_id_idx").on(t.project_id),
    index("final_reel_status_idx").on(t.status),
  ]
);

export type FinalReel = InferSelectModel<typeof final_reels>;
export type NewFinalReel = typeof final_reels.$inferInsert;




