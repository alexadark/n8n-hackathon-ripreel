/**
 * Shared Types for Server Actions
 *
 * These types can be imported by both client and server code.
 * Only type definitions - no runtime code.
 */

// =============================================================================
// Timeline Types
// =============================================================================

export interface TimelineShot {
  id: string;
  scene_id: string;
  shot_index: number;
  description: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  veo3_prompt: string | null;
  selected_model: string | null;
  video_status: "pending" | "generating" | "ready" | "failed";
  duration_seconds: number;
}

export interface TimelineScene {
  id: string;
  scene_number: number;
  slugline: string;
  shots: TimelineShot[];
}

export interface TimelineData {
  projectId: string;
  projectName: string;
  scenes: TimelineScene[];
}

// =============================================================================
// Scene Image Types
// =============================================================================

export interface BibleInjectionData {
  characters: Array<{
    name: string;
    portrait_url?: string | null;
    three_quarter_url?: string | null;
    full_body_url?: string | null;
  }>;
  locations: Array<{
    name: string;
    image_url?: string | null;
  }>;
  props: Array<{
    name: string;
    image_url?: string | null;
  }>;
  stylePrompt?: string;
}

export type GenerationModel =
  | "flux_1_1_pro_ultra"
  | "seedream"
  | "nano_banana";

export interface SceneModelSelection {
  sceneId: string;
  selectedModel: GenerationModel;
}

// =============================================================================
// Assembly Types
// =============================================================================

export interface AssemblyActionResult {
  success: boolean;
  reelId?: string;
  error?: string;
  status?: string;
  progress?: number;
  videoUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
}

// =============================================================================
// Generic Action Result
// =============================================================================

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}
