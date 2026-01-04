import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { assetStatusEnum } from "./enums";
import { scenes } from "./scenes";
import type { InferSelectModel } from "drizzle-orm";

/**
 * VEO 3.1 Structured Prompt Data
 *
 * 7-component prompt structure for professional video generation:
 * - subject: Character description (15+ physical attributes)
 * - action: Movements, gestures, camera motion
 * - scene: Environment, props, lighting setup
 * - style: Camera shot type, visual aesthetic
 * - dialogue: Character speech with tone (null if no dialogue)
 * - sounds: Ambient, SFX, foley, music
 * - technical: Negative prompts (no subtitles, watermarks)
 *
 * All fields are optional to support partial updates.
 * Aligns with VideoPromptVeo3 from scenes.ts.
 */
export interface Veo3PromptData {
  subject?: string | null;
  action?: string | null;
  scene?: string | null;
  style?: string | null;
  dialogue?: string | null;
  sounds?: string | null;
  technical?: string | null;
}

/**
 * Scene Shots Table for Veo 3.1 Video Generation
 *
 * Workflow:
 * - Single shot scenes (duration <= 8s): Generate start frame image → Generate video (no extend)
 * - Multi-shot scenes (duration > 8s):
 *   - Shot 1: Generate start frame → Generate video → Store veo_task_id
 *   - Shot 2+: Use Veo 3.1 extend API with previous shot's veo_task_id
 *
 * First/Last frame support (Veo 3.1):
 * - start_frame_image_url: Generated from composition_instruction
 * - end_frame_image_url: Generated from end_frame_instruction (optional)
 * - Both can be passed to Veo 3.1 for better video generation with controlled start/end
 */
export const scene_shots = pgTable(
  "scene_shots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scene_id: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),

    // Shot metadata from n8n workflow
    shot_number: integer("shot_number").notNull(),
    shot_duration_seconds: integer("shot_duration_seconds").notNull().default(8),
    is_first_shot: boolean("is_first_shot").notNull().default(true),
    shot_type: text("shot_type"), // "Wide Establishing Shot", "Medium Shot", "Close-up", etc.

    // Prompts from n8n workflow
    composition_instruction: text("composition_instruction"), // Start frame prompt (null for extend shots)
    composition_instruction_seedream: text("composition_instruction_seedream"), // Model-specific prompt for Seedream
    composition_instruction_nano_banana: text("composition_instruction_nano_banana"), // Model-specific prompt for Nano Banana
    action_prompt: text("action_prompt"), // Legacy: single-string video prompt (fallback)
    end_frame_instruction: text("end_frame_instruction"), // End frame prompt (optional, for state changes)
    dialogue_segment: text("dialogue_segment"),

    // VEO 3.1 Structured Prompt (7-component format)
    // Preferred over action_prompt - provides full control over video generation
    video_prompt_veo3: jsonb("video_prompt_veo3").$type<Veo3PromptData>(),

    // Start frame image generation
    start_frame_image_url: text("start_frame_image_url"),
    start_frame_storage_path: text("start_frame_storage_path"),
    start_frame_status: assetStatusEnum("start_frame_status"),

    // End frame image generation (optional, for significant state changes)
    end_frame_image_url: text("end_frame_image_url"),
    end_frame_storage_path: text("end_frame_storage_path"),
    end_frame_status: assetStatusEnum("end_frame_status"),

    // Video generation
    video_url: text("video_url"),
    video_storage_path: text("video_storage_path"),
    video_status: assetStatusEnum("video_status"), // No default - null means "pending" (not yet triggered)

    // Veo 3.1 specific fields
    veo_task_id: text("veo_task_id"), // Task ID returned by Veo API (needed for extend)
    previous_shot_id: uuid("previous_shot_id"), // Reference to previous shot for extend chain
    uses_extend: boolean("uses_extend").notNull().default(false), // True if this shot uses extend API

    // n8n job tracking
    start_frame_job_id: text("start_frame_job_id"),
    end_frame_job_id: text("end_frame_job_id"),
    video_job_id: text("video_job_id"),

    // Error tracking
    error_message: text("error_message"),

    // Timestamps
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("scene_shot_scene_id_idx").on(t.scene_id),
    index("scene_shot_number_idx").on(t.scene_id, t.shot_number),
    index("scene_shot_video_status_idx").on(t.video_status),
    index("scene_shot_veo_task_id_idx").on(t.veo_task_id),
  ]
);

export type SceneShot = InferSelectModel<typeof scene_shots>;
export type NewSceneShot = typeof scene_shots.$inferInsert;
