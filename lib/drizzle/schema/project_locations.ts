import { pgTable, uuid, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { bibleAssetStatusEnum, locationTypeEnum } from "./enums";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Time variant descriptions for different times of day
 */
export interface TimeVariants {
  day?: string;
  night?: string;
  dawn?: string;
  dusk?: string;
}

/**
 * Location data extracted from screenplay (Bible asset)
 * Used for consistent location portrayal across all scenes
 */
export interface LocationRawData {
  atmosphere?: string;
  key_features?: string[];
  lighting_notes?: string;
  sound_ambience?: string;
  [key: string]: unknown;
}

export const projectLocations = pgTable(
  "project_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Location identity
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull().default("interior"),

    // Visual description for image generation
    visual_description: text("visual_description").notNull(),

    // Model-specific prompts from n8n Bible generation
    prompt_seedream: text("prompt_seedream"),
    prompt_nano_banana: text("prompt_nano_banana"),

    // Time-of-day variations
    time_variants: jsonb("time_variants").$type<TimeVariants>(),

    // Approved location image
    approved_image_url: text("approved_image_url"),
    approved_image_storage_path: text("approved_image_storage_path"),

    // Generation status
    image_status: bibleAssetStatusEnum("image_status").notNull().default("pending"),
    generation_prompt: text("generation_prompt"),
    n8n_job_id: text("n8n_job_id"),
    error_message: text("error_message"),

    // AI Model Selection
    selected_model: text("selected_model").default("seedream-4.5-text-to-image"),

    // Upload tracking
    is_uploaded: jsonb("is_uploaded").$type<{ uploaded: boolean }>(),

    // Full AI extraction data
    raw_data: jsonb("raw_data").$type<LocationRawData>(),

    // Timestamps
    approved_at: timestamp("approved_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("location_project_id_idx").on(t.project_id),
    index("location_image_status_idx").on(t.image_status),
    index("location_type_idx").on(t.type),
  ]
);

export type ProjectLocation = InferSelectModel<typeof projectLocations>;
export type NewProjectLocation = typeof projectLocations.$inferInsert;
