import { pgTable, uuid, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { bibleAssetStatusEnum, propImportanceEnum, propGenerationMethodEnum } from "./enums";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Prop data extracted from screenplay (Bible asset)
 * Key props may have reference images for consistency
 */
export interface PropRawData {
  material?: string;
  color?: string;
  size?: string;
  condition?: string;
  symbolic_meaning?: string;
  scenes_used?: number[];
  [key: string]: unknown;
}

export const projectProps = pgTable(
  "project_props",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Prop identity
    name: text("name").notNull(),
    importance: propImportanceEnum("importance").notNull().default("medium"),

    // Generation method: GENERATE (image reference) or DESCRIBE (text only)
    generation_method: propGenerationMethodEnum("generation_method").notNull().default("GENERATE"),

    // Scale reference for DESCRIBE props (e.g., "thumb-sized", "palm-sized")
    scale_reference: text("scale_reference"),

    // Visual description for image generation
    visual_description: text("visual_description").notNull(),

    // Model-specific prompts from n8n Bible generation
    prompt_seedream: text("prompt_seedream"),
    prompt_nano_banana: text("prompt_nano_banana"),

    // Approved prop image (optional - mainly for high importance props)
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
    raw_data: jsonb("raw_data").$type<PropRawData>(),

    // Timestamps
    approved_at: timestamp("approved_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("prop_project_id_idx").on(t.project_id),
    index("prop_image_status_idx").on(t.image_status),
    index("prop_importance_idx").on(t.importance),
  ]
);

export type ProjectProp = InferSelectModel<typeof projectProps>;
export type NewProjectProp = typeof projectProps.$inferInsert;
