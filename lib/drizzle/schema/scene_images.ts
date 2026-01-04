import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { imageGenerationMethodEnum, assetStatusEnum } from "./enums";
import { scenes } from "./scenes";
import type { InferSelectModel } from "drizzle-orm";

export const scene_images = pgTable(
  "scene_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scene_id: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    generation_method: imageGenerationMethodEnum("generation_method").notNull(),
    image_storage_path: text("image_storage_path"),
    image_url: text("image_url"),
    status: assetStatusEnum("status").default("generating").notNull(),
    n8n_job_id: text("n8n_job_id"),
    generation_prompt: text("generation_prompt"),
    refinement_feedback: text("refinement_feedback"),
    refinement_iteration: integer("refinement_iteration").default(0).notNull(),
    parent_image_id: uuid("parent_image_id"),
    generation_phase: text("generation_phase").$type<"nano-banana" | "flux-enhancement">(),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("scene_image_scene_id_idx").on(t.scene_id),
    index("scene_image_status_idx").on(t.status),
    index("scene_image_approved_at_idx").on(t.approved_at),
  ]
);

// Add self-referencing foreign key constraint after table definition
// Note: parent_image_id references scene_images.id for refinement chain tracking

export type SceneImage = InferSelectModel<typeof scene_images>;
export type NewSceneImage = typeof scene_images.$inferInsert;
