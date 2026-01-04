/**
 * Type definitions for n8n MCP integration
 * Shared types used across workflow invocations and callbacks
 */

// ============================================================================
// Workflow Discovery Types
// ============================================================================

export interface WorkflowInfo {
  /** Workflow name as configured in n8n */
  name: string;
  /** n8n workflow ID */
  id: string;
  /** Whether workflow is currently active */
  active: boolean;
  /** Webhook URL if workflow has webhook trigger */
  webhookUrl?: string;
  /** Webhook HTTP method (GET, POST, etc.) */
  webhookMethod?: string;
  /** Human-readable description of the workflow */
  description?: string;
}

export interface DiscoverWorkflowsOptions {
  /** Filter by workflow name pattern (regex supported) */
  namePattern?: string;
  /** Only return active workflows */
  activeOnly?: boolean;
}

// ============================================================================
// Workflow Invocation Types
// ============================================================================

export type WorkflowExecutionMode = "sync" | "async";

/**
 * User-provided API keys for external services
 * These are passed to n8n workflows via the webhook payload
 */
export interface ApiKeys {
  /** Anthropic API key for LLM operations */
  anthropic?: string | null;
  /** Kie.ai API key for image/video generation */
  kie?: string | null;
}

export interface InvokeWorkflowOptions {
  /** Workflow execution mode - sync returns data immediately, async uses callbacks */
  mode?: WorkflowExecutionMode;
  /** Callback URL for async workflows (required for async mode) */
  callbackUrl?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional headers to send with webhook request */
  headers?: Record<string, string>;
  /** User-provided API keys to pass to the workflow */
  apiKeys?: ApiKeys;
}

export interface WorkflowInvocationResult<T = unknown> {
  /** Whether invocation was successful */
  success: boolean;
  /** Workflow execution ID (for job status polling) */
  executionId?: string;
  /** Response data (only in sync mode or if workflow responds immediately) */
  data?: T;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Job Status Types
// ============================================================================

export type JobStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "waiting"
  | "canceled";

export interface JobStatusResult<T = unknown> {
  /** Current job status */
  status: JobStatus;
  /** Job completion percentage (0-100) */
  progress?: number;
  /** Result data if job completed */
  data?: T;
  /** Error message if job failed */
  error?: string;
  /** Timestamp when job started */
  startedAt?: string;
  /** Timestamp when job finished */
  finishedAt?: string;
}

// ============================================================================
// Ripreel-Specific Workflow Payloads
// ============================================================================

/**
 * Payload for screenplay parsing workflow
 */
export interface ParseScriptPayload {
  script_content: string;
  visual_style?: string;
  is_pdf: boolean;
  project_id: string;
  user_id: string;
}

/**
 * Payload for Nano Banana image generation
 */
export interface NanoBananaPayload {
  scene_image_id: string;
  prompt: string;
  callback_url: string;
}

/**
 * Payload for Flux image enhancement
 */
export interface FluxEnhancementPayload {
  scene_image_id: string;
  source_image_url: string;
  enhancement_prompt: string;
  callback_url: string;
}

/**
 * Payload for image-to-video generation
 */
export interface ImageToVideoPayload {
  scene_video_id: string;
  source_image_url: string;
  motion_prompt?: string;
  duration?: number;
  callback_url: string;
}

/**
 * Payload for audio generation (VO/SFX/Music)
 */
export interface AudioGenerationPayload {
  scene_audio_id: string;
  audio_type: "voiceover" | "sfx" | "music";
  script_text?: string; // For voiceover
  audio_description: string;
  duration: number;
  callback_url: string;
}

/**
 * Payload for final reel assembly
 */
export interface AssemblyPayload {
  final_reel_id: string;
  project_id: string;
  timeline_json: string; // Serialized timeline configuration
  callback_url: string;
  progress_webhook_url: string; // For real-time progress updates
}

// ============================================================================
// Webhook Callback Types
// ============================================================================

/**
 * Generic webhook callback payload
 */
export interface WebhookCallback<T = unknown> {
  /** ID of the resource being updated */
  resource_id: string;
  /** Status of the operation */
  status: "ready" | "failed" | "processing";
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error_message?: string;
  /** Execution metadata */
  execution_id?: string;
}

/**
 * Scene parsing webhook callback
 */
export interface SceneParseCallback extends WebhookCallback {
  scenes?: Array<{
    scene_number: number;
    slugline: string;
    location: string;
    time_of_day: string;
    action_description: string;
    image_generation_prompt: string;
    [key: string]: unknown;
  }>;
  visual_style?: string;
}

/**
 * Image generation webhook callback
 */
export interface ImageGenerationCallback extends WebhookCallback {
  scene_image_id: string;
  image_url?: string;
}

/**
 * Video generation webhook callback
 */
export interface VideoGenerationCallback extends WebhookCallback {
  scene_video_id: string;
  video_url?: string;
  thumbnail_url?: string;
}

/**
 * Audio generation webhook callback
 */
export interface AudioGenerationCallback extends WebhookCallback {
  scene_audio_id: string;
  audio_url?: string;
  audio_type: "voiceover" | "sfx" | "music";
}

/**
 * Assembly progress webhook callback
 */
export interface AssemblyProgressCallback {
  final_reel_id: string;
  progress: number; // 0-100
  current_step: string;
  status: "processing" | "encoding" | "uploading";
}

/**
 * Assembly complete webhook callback
 */
export interface AssemblyCompleteCallback extends WebhookCallback {
  final_reel_id: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
}

// ============================================================================
// Bible Data Types (from Script Parsing)
// ============================================================================

/**
 * Character data from n8n Bible parsing
 * Includes three-shot prompt system for character reference images
 */
export interface BibleCharacter {
  name: string;
  role: "lead" | "supporting" | "background" | string;
  tier?: string; // "TIER 1", "TIER 2", "TIER 3"
  scene_count?: number;

  // Three-shot prompt system (new format from n8n)
  img_portrait_prompt?: string;        // Extreme close-up
  img_three_quarter_prompt?: string;   // Medium shot, 45° angle
  img_full_body_prompt?: string;       // Wide shot, full costume

  // n8n split workflow format (seedream/nano_banana variants)
  visual_dna_reference?: string;
  portrait_prompt_seedream?: string;
  portrait_prompt_nano_banana?: string;
  three_quarter_prompt_seedream?: string;
  three_quarter_prompt_nano_banana?: string;
  full_body_prompt_seedream?: string;
  full_body_prompt_nano_banana?: string;

  // Legacy field (for backward compatibility)
  visual_dna?: string;

  // Optional character details
  backstory?: string;
  emotional_archetype?: string;
  first_appearance?: number;
  dialogue_style?: string;
  costume_notes?: string;
  relationships?: Record<string, string>;
}

/**
 * Location data from n8n Bible parsing
 */
export interface BibleLocation {
  name: string;
  type?: "INT" | "EXT";
  visual_description?: string;
  visual_dna?: string; // Legacy format

  // n8n split workflow format (seedream/nano_banana variants)
  prompt_seedream?: string;
  prompt_nano_banana?: string;

  time_variants?: {
    day?: string;
    night?: string;
    dawn?: string;
    dusk?: string;
  };
  atmosphere?: string;
  key_features?: string[];
  lighting_notes?: string;
  sound_ambience?: string;
}

/**
 * Prop data from n8n Bible parsing
 */
export interface BibleProp {
  name: string;
  importance?: "high" | "medium" | "low" | string;
  generation_method?: "GENERATE" | "DESCRIBE" | string;
  scale_reference?: string;
  visual_description?: string;
  visual_dna?: string; // Legacy format

  // n8n split workflow format (seedream/nano_banana variants)
  prompt_seedream?: string;
  prompt_nano_banana?: string;

  material?: string;
  color?: string;
  size?: string;
  condition?: string;
  symbolic_meaning?: string;
}

/**
 * Complete Bible data structure from n8n
 */
export interface BibleData {
  characters: BibleCharacter[];
  locations: BibleLocation[];
  props: BibleProp[];
}

/**
 * Result from parseScreenplay workflow
 * Contains either Bible data, scenes, or both
 */
export interface ParseScriptResult {
  success: boolean;
  bible?: BibleData;
  scenes?: Array<Record<string, unknown>>;
  error?: string;
}

/**
 * Style configuration passed to n8n workflows
 * Contains all visual style parameters for Bible and Scene generation
 */
export interface N8nStyleConfig {
  // Bible generation
  film_stock_prefix: string;
  composition_rules: string;
  lighting_style: string;
  color_palette: string;
  neutral_background: string;
  atmosphere_keywords: string;
  texture_keywords: string;
  character_pose_style: string;
  location_style: string;
  prop_style: string;
  // Scene/Video generation
  camera_movement_style: string;
  default_camera_angles: string;
  veo_color_grade: string;
  veo_style_reference: string;
  music_style: string;
  narrator_style: string;
  default_ambient: string;
}

/**
 * Payload for generate_bible workflow (split workflow - Bible only)
 */
export interface GenerateBiblePayload {
  script_content: string;
  visual_style?: string; // Legacy: style slug for backward compatibility
  style_config?: N8nStyleConfig; // NEW: Full style configuration
  is_pdf: boolean;
  project_id: string;
  user_id: string;
}

/**
 * Result from generate_bible workflow
 * Returns Bible data (characters, locations, props, inline_characters) + style_data
 */
export interface GenerateBibleResult {
  success: boolean;
  data?: {
    characters: BibleCharacter[];
    locations: BibleLocation[];
    props: BibleProp[];
    inline_characters?: Array<{
      name: string;
      appears_in_scenes: number[];
      inline_description_seedream: string;
      inline_description_nano_banana: string;
    }>;
    style_data?: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Payload for generate_scenes workflow (split workflow - Scenes only)
 */
export interface GenerateScenesPayload {
  script_content: string;
  visual_style: string; // Legacy: style slug for backward compatibility
  style_config?: N8nStyleConfig; // NEW: Full style configuration
  is_pdf?: boolean; // Flag to tell n8n to download and extract PDF text
  bible_data: {
    characters: BibleCharacter[];
    locations: BibleLocation[];
    props: BibleProp[];
    inline_characters?: Array<{
      name: string;
      appears_in_scenes: number[];
      inline_description_seedream: string;
      inline_description_nano_banana: string;
    }>;
  };
  project_id: string;
}

/**
 * Result from generate_scenes workflow
 */
export interface GenerateScenesResult {
  success: boolean;
  data?: {
    scenes: Array<Record<string, unknown>>;
    bible_data?: {
      characters: BibleCharacter[];
      locations: BibleLocation[];
      props: BibleProp[];
      inline_characters?: Array<{
        name: string;
        appears_in_scenes: number[];
        inline_description_seedream: string;
        inline_description_nano_banana: string;
      }>;
    };
  };
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class N8nWorkflowError extends Error {
  constructor(
    message: string,
    public readonly workflowName?: string,
    public readonly executionId?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "N8nWorkflowError";
  }
}

export class N8nDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "N8nDiscoveryError";
  }
}
