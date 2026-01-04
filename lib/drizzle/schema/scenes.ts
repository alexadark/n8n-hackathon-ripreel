import { pgTable, uuid, integer, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { sceneValidationStatusEnum } from "./enums";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Character reference in scene data - can be a string or rich object
 */
export type SceneCharacter = string | { name?: string; role?: string; emotional_state?: string; actions?: string[] };

/**
 * Prop/material reference in scene data - can be a string or rich object
 */
export type SceneProp = string | { item?: string; importance?: string; visual_note?: string };

/**
 * Inline character (Tier 3 extra) - description for scene injection
 * These characters don't appear in the Bible but need visual descriptions in scene prompts
 */
export interface InlineCharacter {
  name: string;
  inline_description_seedream: string;
  inline_description_nano_banana: string;
}

/**
 * Veo 3.1 7-component video prompt structure
 */
export interface VideoPromptVeo3 {
  subject: string;     // 15+ attributes describing character
  action: string;      // Detailed movement sequence
  scene: string;       // Environment description
  style: string;       // Camera work with positioning
  dialogue: string | null;  // Character says: 'text' with tone OR null
  sounds: string;      // Ambient: X. SFX: Y. Foley: Z.
  technical: string;   // Negative prompts
}

/**
 * Full scene data including image generation prompts
 * This extends RawSceneData with composed prompts after Bible approval
 */
export interface SceneData {
  scene_number?: number;
  slugline?: string;
  location?: string;
  location_ref?: string;
  interior_exterior?: string;
  time_of_day?: string;
  duration_estimate?: number;
  action_description?: string;
  action_summary?: string;
  dialogue_snippet?: string;
  characters_present?: SceneCharacter[];
  props_and_materials?: SceneProp[];
  visual_mood?: {
    lighting?: string;
    color_palette?: string;
    composition?: string;
    atmosphere?: string;
  };
  audio_requirements?: {
    ambient?: string[] | string;
    sfx?: string[] | string;
    music_mood?: string;
    dialogue_tone?: string;
    dialogue_transcript?: string;
  };
  image_generation_prompt?: string;
  production_notes?: string;
  bible_location_id?: string;
  bible_character_ids?: string[];
  props_used?: string[];
  bible_prop_ids?: string[];
  // Image generation fields from N8N workflow
  shot_type?: string;
  composition_instruction?: string;
  main_subject_ref?: string;
  wardrobe_description?: string;
  visual_atmosphere?: string;

  // Model-specific composition prompts (from n8n scene parsing)
  composition_instruction_seedream?: string;
  composition_instruction_nano_banana?: string;

  // Inline characters (Tier 3 extras) - descriptions to inject into scene prompts
  inline_characters?: InlineCharacter[];

  // Prop injection method: maps prop name to IMAGE_REFERENCE or TEXT_DESCRIBE
  prop_injection_method?: Record<string, "IMAGE_REFERENCE" | "TEXT_DESCRIBE">;

  // Shot-based video generation (Veo 3.1 support)
  estimated_duration_seconds?: number;
  requires_extend?: boolean;
  shots?: ShotData[];

  // Veo 3.1 video prompt (7-component format)
  video_prompt_veo3?: VideoPromptVeo3;
}

/**
 * Shot data for Veo 3.1 video generation
 * - Single shot scenes: Generate video from image (no extend)
 * - Multi-shot scenes: First shot generates video, subsequent shots use extend API
 */
export interface ShotData {
  shot_number: number;
  shot_duration_seconds: number;
  is_first_shot: boolean;
  shot_type: string;
  // Image prompt for start frame (null for extend shots after first)
  composition_instruction: string | null;
  // Model-specific composition prompts for per-shot image generation
  composition_instruction_seedream?: string | null;
  composition_instruction_nano_banana?: string | null;
  // Video motion/action description for Veo 3.1
  action_prompt: string;
  // End frame image prompt (for shots with significant state change)
  end_frame_instruction: string | null;
  // Dialogue segment for this shot
  dialogue_segment: string | null;
  // Veo 3.1 video prompt (7-component format) - from n8n Scenes workflow
  video_prompt_veo3?: VideoPromptVeo3;
}

/**
 * Raw scene data from Stage 1 (Bible extraction)
 * Contains scene info WITHOUT image generation prompts
 * Image prompts are composed in Stage 2 after Bible approval
 *
 * Supports both legacy field names and N8N workflow field names:
 * - location OR bible_location_id
 * - characters_present OR bible_character_ids
 * - props_used OR bible_prop_ids
 * - action_description OR action_summary
 */
export interface RawSceneData {
  scene_number: number;
  slugline: string;
  time_of_day: string;
  interior_exterior: "INT" | "EXT";
  duration_estimate?: number;

  // Location - support both field names
  location?: string;
  bible_location_id?: string;

  // Characters - support both field names (names only, reference to Bible)
  characters_present?: string[];
  bible_character_ids?: string[];

  // Props - support both field names (names only, reference to Bible)
  props_used?: string[];
  bible_prop_ids?: string[];

  // Action - support both field names
  action_description?: string;
  action_summary?: string;

  dialogue_snippet?: string;

  visual_mood?: {
    lighting?: string;
    color_palette?: string;
    composition?: string;
    atmosphere?: string;
  };

  audio_requirements?: {
    ambient?: string[] | string;
    sfx?: string[] | string;
    music_mood?: string;
    dialogue_tone?: string;
    dialogue_transcript?: string;
    voice_type?: string;
    music?: string;
  };

  production_notes?: string;

  // NEW: Image generation fields from N8N workflow
  main_subject_ref?: string;
  wardrobe_description?: string;
  shot_type?: string;
  composition_instruction?: string;
  visual_atmosphere?: string;

  // Model-specific composition prompts (from n8n scene parsing)
  composition_instruction_seedream?: string;
  composition_instruction_nano_banana?: string;

  // Inline characters (Tier 3 extras) - descriptions to inject into scene prompts
  inline_characters?: InlineCharacter[];

  // Prop injection method: maps prop name to IMAGE_REFERENCE or TEXT_DESCRIBE
  prop_injection_method?: Record<string, "IMAGE_REFERENCE" | "TEXT_DESCRIBE">;

  // Shot-based video generation (Veo 3.1 support)
  estimated_duration_seconds?: number;
  requires_extend?: boolean;
  shots?: ShotData[];

  // Veo 3.1 video prompt (7-component format)
  video_prompt_veo3?: VideoPromptVeo3;
}

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scene_number: integer("scene_number").notNull(),
    slugline: text("slugline").notNull(),
    action_text: text("action_text").notNull(),
    characters: text("characters").array(),
    validation_status: sceneValidationStatusEnum("validation_status")
      .default("pending")
      .notNull(),
    user_edits: text("user_edits"),

    // Raw scene data from Stage 1 (Bible extraction) - no image prompts yet
    raw_scene_data: jsonb("raw_scene_data").$type<RawSceneData>(),

    // Full composed scene data from Stage 2 (after Bible approval) - includes image prompts
    full_data: jsonb("full_data").$type<SceneData>(),

    // Approved image from dual-model variant selection
    approved_image_id: uuid("approved_image_id"),
    approved_image_url: text("approved_image_url"),

    approved_at: timestamp("approved_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("scene_project_id_idx").on(t.project_id),
    index("scene_validation_status_idx").on(t.validation_status),
    index("scene_number_idx").on(t.scene_number),
  ]
);

export type Scene = InferSelectModel<typeof scenes>;
export type NewScene = typeof scenes.$inferInsert;
