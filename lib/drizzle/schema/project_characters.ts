import { pgTable, uuid, text, timestamp, index, jsonb, integer } from "drizzle-orm/pg-core";
import { bibleAssetStatusEnum, characterRoleEnum, characterTierEnum } from "./enums";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Character data extracted from screenplay (Bible asset)
 * Used for consistent character portrayal across all scenes
 *
 * MVP SIMPLIFICATION: Portrait only (no 3/4 view, no full body)
 * Both Seedream 4.5 and Nano Banana Pro variants are generated
 */
export interface CharacterRawData {
  emotional_archetype?: string;
  first_appearance?: number;
  dialogue_style?: string;
  relationships?: Record<string, string>;
  costume_notes?: string;
  [key: string]: unknown;
}

export const projectCharacters = pgTable(
  "project_characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Character identity
    name: text("name").notNull(),
    role: characterRoleEnum("role").notNull().default("supporting"),

    // Character tier for Bible inclusion (from n8n classification)
    // main/supporting: Portrait in Bible
    // extra: NOT stored here (inline in scenes)
    tier: characterTierEnum("tier").notNull().default("supporting"),
    scene_count: integer("scene_count").default(1),

    // Visual description for image generation (model-agnostic reference)
    visual_dna: text("visual_dna").notNull(),
    backstory: text("backstory"),

    // PORTRAIT ONLY (MVP Simplification)
    // Model-specific prompts from n8n Bible generation
    portrait_prompt_seedream: text("portrait_prompt_seedream"),
    portrait_prompt_nano_banana: text("portrait_prompt_nano_banana"),
    portrait_prompt: text("portrait_prompt"), // Legacy/fallback prompt
    portrait_image_url: text("portrait_image_url"),
    portrait_storage_path: text("portrait_storage_path"),
    portrait_status: bibleAssetStatusEnum("portrait_status").notNull().default("pending"),
    portrait_n8n_job_id: text("portrait_n8n_job_id"),

    // AI Model Selection
    selected_model: text("selected_model").default("seedream-4.5-text-to-image"),

    // Upload tracking (simplified - portrait only)
    upload_source: jsonb("upload_source").$type<{
      portrait?: boolean;
    }>(),

    // Legacy fields (kept for backward compatibility)
    approved_image_url: text("approved_image_url"),
    approved_image_storage_path: text("approved_image_storage_path"),
    image_status: bibleAssetStatusEnum("image_status").notNull().default("pending"),
    generation_prompt: text("generation_prompt"),
    n8n_job_id: text("n8n_job_id"),
    error_message: text("error_message"),

    // Full AI extraction data
    raw_data: jsonb("raw_data").$type<CharacterRawData>(),

    // Timestamps
    approved_at: timestamp("approved_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("character_project_id_idx").on(t.project_id),
    index("character_image_status_idx").on(t.image_status),
    index("character_role_idx").on(t.role),
    index("character_tier_idx").on(t.tier),
    index("character_portrait_status_idx").on(t.portrait_status),
  ]
);

export type ProjectCharacter = InferSelectModel<typeof projectCharacters>;
export type NewProjectCharacter = typeof projectCharacters.$inferInsert;
