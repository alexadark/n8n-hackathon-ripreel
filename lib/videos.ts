/**
 * Video Generation Query Functions
 *
 * Server-side functions for querying video generation status.
 * Used by Server Components and Server Actions.
 */

import { db } from "@/lib/drizzle/db.server";
import { scene_videos, scenes, type Scene } from "@/lib/drizzle/schema";
import { eq, count, inArray } from "drizzle-orm";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum concurrent video generation jobs
 * n8n instance has 8GB RAM - video generation is memory intensive
 */
export const MAX_CONCURRENT_VIDEO_JOBS = 3;

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get count of currently generating videos
 * Used for batch limiting (max 2-3 concurrent jobs)
 */
export async function getRunningVideoJobCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(scene_videos)
    .where(eq(scene_videos.status, "generating"));

  return result?.count ?? 0;
}

/**
 * Check if we can start a new video generation job
 */
export async function canStartVideoGeneration(): Promise<boolean> {
  const runningJobs = await getRunningVideoJobCount();
  return runningJobs < MAX_CONCURRENT_VIDEO_JOBS;
}

/**
 * Get scenes that are queued for video generation
 * These are scenes with approved images but no video record
 */
export async function getQueuedScenesForVideo(projectId: string): Promise<Scene[]> {
  // Get all scenes for the project
  const scenesWithApproval = await db
    .select()
    .from(scenes)
    .where(eq(scenes.project_id, projectId));

  // Filter to those with approved images but no video
  const queuedScenes: Scene[] = [];

  for (const scene of scenesWithApproval) {
    if (!scene.approved_image_id) continue;

    // Check if video already exists for this scene
    const [existingVideo] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.scene_id, scene.id))
      .limit(1);

    if (!existingVideo) {
      queuedScenes.push(scene);
    }
  }

  return queuedScenes;
}

/**
 * Get video for a scene (if exists)
 */
export async function getSceneVideo(sceneId: string) {
  const [video] = await db
    .select()
    .from(scene_videos)
    .where(eq(scene_videos.scene_id, sceneId))
    .limit(1);

  return video ?? null;
}

/**
 * Get video generation status for all scenes in a project
 */
export async function getProjectVideoStatus(projectId: string): Promise<
  Array<{
    scene_id: string;
    scene_number: number;
    slugline: string;
    approved_image_url: string | null;
    video: typeof scene_videos.$inferSelect | null;
  }>
> {
  // Get all scenes for the project
  const projectScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.project_id, projectId))
    .orderBy(scenes.scene_number);

  // Get all videos for the project's scenes
  const sceneIds = projectScenes.map((s) => s.id);
  const videos = sceneIds.length > 0
    ? await db.select().from(scene_videos).where(
        inArray(scene_videos.scene_id, sceneIds)
      )
    : [];

  // Create a map of scene_id -> video
  const videoMap = new Map(videos.map((v) => [v.scene_id, v]));

  return projectScenes.map((scene) => ({
    scene_id: scene.id,
    scene_number: scene.scene_number,
    slugline: scene.slugline,
    approved_image_url: scene.approved_image_url,
    video: videoMap.get(scene.id) ?? null,
  }));
}

/**
 * Build VEO3 7-component prompt from available scene data
 *
 * VEO3 optimal prompt structure:
 * 1. Subject - Character description (15+ attributes)
 * 2. Action - Movement sequence
 * 3. Scene - Environment description
 * 4. Style - Camera work
 * 5. Dialogue - "Character says: 'text'" with tone
 * 6. Sounds - Ambient, SFX, Foley, Music
 * 7. Technical - Negative prompts
 */
export function buildVeo3Prompt(scene: Scene): {
  subject: string;
  action: string;
  scene: string;
  style: string;
  dialogue: string | null;
  sounds: string;
  technical: string;
} | null {
  const rawData = scene.raw_scene_data;
  if (!rawData) return null;

  // 1. SUBJECT - Character(s) in the scene
  const characters = rawData.bible_character_ids || rawData.characters_present || [];
  const charNames = characters.map(c =>
    typeof c === 'string' ? c : (c as { name?: string }).name || 'Character'
  );

  let subject = '';
  if (charNames.length > 0) {
    subject = charNames.join(' and ');
    // Add context from slugline (INT/EXT, location type)
    const slugline = rawData.slugline || scene.slugline || '';
    if (slugline.includes('NIGHT')) {
      subject += ', dimly lit, shadows on face';
    } else if (slugline.includes('DAY')) {
      subject += ', naturally lit';
    }
  } else {
    subject = 'Empty scene, no characters visible';
  }

  // 2. ACTION - What's happening (infer from context if not available)
  let action = rawData.action_description || rawData.action_summary || '';
  if (!action) {
    // Infer action from dialogue and context
    const dialogue = rawData.audio_requirements?.dialogue_transcript;
    if (dialogue) {
      if (charNames.length === 1) {
        action = `${charNames[0]} speaks, subtle movements, emotional delivery`;
      } else if (charNames.length > 1) {
        action = `${charNames.join(' and ')} in conversation, exchanging glances`;
      }
    } else {
      // No dialogue - ambient scene
      action = charNames.length > 0
        ? `${charNames.join(' and ')} present in the scene, subtle movements`
        : 'Atmospheric establishing shot, slow camera movement';
    }
  }

  // 3. SCENE - Environment from slugline + location
  const slugline = rawData.slugline || scene.slugline || '';
  const location = rawData.bible_location_id || rawData.location || '';
  const timeOfDay = rawData.time_of_day || '';

  let sceneDesc = slugline;
  if (location && !slugline.toLowerCase().includes(location.toLowerCase())) {
    sceneDesc += `. ${location}`;
  }
  if (timeOfDay && !slugline.toLowerCase().includes(timeOfDay.toLowerCase())) {
    sceneDesc += `, ${timeOfDay} lighting`;
  }

  // Add atmosphere from visual_mood if available, otherwise infer from slugline
  if (rawData.visual_mood?.atmosphere) {
    sceneDesc += `. ${rawData.visual_mood.atmosphere}`;
  } else {
    // Infer atmosphere from slugline
    const slugLower = slugline.toLowerCase();
    if (slugLower.includes('nightclub') || slugLower.includes('bar')) {
      sceneDesc += `. Smoky, intimate noir atmosphere`;
    } else if (slugLower.includes('night') && slugLower.includes('int')) {
      sceneDesc += `. Intimate, shadowy atmosphere`;
    } else if (slugLower.includes('night') && slugLower.includes('ext')) {
      sceneDesc += `. Noir, mysterious atmosphere`;
    } else if (slugLower.includes('alley')) {
      sceneDesc += `. Dangerous, claustrophobic atmosphere`;
    }
  }

  if (rawData.visual_mood?.lighting) {
    sceneDesc += `. Lighting: ${rawData.visual_mood.lighting}`;
  } else {
    // Infer lighting from slugline
    const slugLower = slugline.toLowerCase();
    if (slugLower.includes('nightclub')) {
      sceneDesc += `. Lighting: dim, neon accents, spotlights`;
    } else if (slugLower.includes('night') && slugLower.includes('int')) {
      sceneDesc += `. Lighting: low key, practical lights`;
    } else if (slugLower.includes('night') && slugLower.includes('ext')) {
      sceneDesc += `. Lighting: streetlights, moonlight`;
    } else if (slugLower.includes('day') && slugLower.includes('int')) {
      sceneDesc += `. Lighting: natural window light`;
    }
  }

  if (rawData.visual_mood?.color_palette) {
    sceneDesc += `. Colors: ${rawData.visual_mood.color_palette}`;
  } else {
    // Infer color palette from slugline
    const slugLower = slugline.toLowerCase();
    if (slugLower.includes('nightclub') || slugLower.includes('bar')) {
      sceneDesc += `. Colors: deep blues, reds, shadows`;
    } else if (slugLower.includes('night')) {
      sceneDesc += `. Colors: warm with deep shadows`;
    }
  }

  // 4. STYLE - Camera work
  let style = rawData.shot_type || rawData.composition_instruction || '';
  if (!style) {
    // Default camera style based on scene type
    if (charNames.length === 1) {
      style = 'Medium shot, eye-level, slight push-in, cinematic depth of field';
    } else if (charNames.length > 1) {
      style = 'Medium two-shot, eye-level, subtle camera movement, cinematic framing';
    } else {
      style = 'Wide establishing shot, slow pan, cinematic composition';
    }
  }

  // 5. DIALOGUE - Format for VEO3
  let dialogue: string | null = null;
  const dialogueText = rawData.audio_requirements?.dialogue_transcript || rawData.dialogue_snippet;
  const voiceType = rawData.audio_requirements?.voice_type;

  if (dialogueText) {
    // Format: Character says: "text" with tone
    if (charNames.length === 1 && voiceType) {
      dialogue = `${charNames[0]} says: "${dialogueText}" with ${voiceType}`;
    } else if (voiceType) {
      dialogue = `Voice: "${dialogueText}" with ${voiceType}`;
    } else {
      dialogue = `"${dialogueText}"`;
    }
  }

  // 6. SOUNDS - Ambient, SFX, Foley, Music
  const audio = rawData.audio_requirements;
  const soundParts: string[] = [];

  if (audio?.ambient) {
    const ambientStr = Array.isArray(audio.ambient) ? audio.ambient.join(', ') : audio.ambient;
    soundParts.push(`Ambient: ${ambientStr}`);
  }
  if (audio?.sfx) {
    const sfxStr = Array.isArray(audio.sfx) ? audio.sfx.join(', ') : audio.sfx;
    soundParts.push(`SFX: ${sfxStr}`);
  }
  if (audio?.music || audio?.music_mood) {
    const musicStr = audio.music || audio.music_mood;
    soundParts.push(`Music: ${musicStr}`);
  }

  const sounds = soundParts.length > 0
    ? soundParts.join('. ')
    : 'Natural ambient sounds';

  // 7. TECHNICAL - Negative prompts for quality
  const technical = 'No text overlays, no watermarks, no logos, cinematic quality, film grain';

  return {
    subject,
    action,
    scene: sceneDesc,
    style,
    dialogue,
    sounds,
    technical,
  };
}

/**
 * Convert VEO3 7-component prompt to single string
 */
export function veo3PromptToString(veo3: ReturnType<typeof buildVeo3Prompt>): string {
  if (!veo3) return '';

  const parts: string[] = [];

  if (veo3.subject) parts.push(veo3.subject);
  if (veo3.action) parts.push(veo3.action);
  if (veo3.scene) parts.push(veo3.scene);
  if (veo3.style) parts.push(veo3.style);
  if (veo3.dialogue) parts.push(veo3.dialogue);
  if (veo3.sounds) parts.push(veo3.sounds);
  if (veo3.technical) parts.push(veo3.technical);

  return parts.join('. ');
}

/**
 * Compose video generation prompt from scene data
 *
 * Priority order:
 * 1. video_prompt_veo3 (7-component format) - Best for Veo 3.1
 * 2. shots[0].action_prompt - Shot-based generation
 * 3. Legacy fields (action_description, shot_type, etc.)
 * 4. Construct from available data (slugline + characters + location + audio)
 */
export function composeVideoPrompt(scene: Scene): string {
  const rawData = scene.raw_scene_data;

  if (!rawData) {
    return scene.action_text || scene.slugline || "Generate video";
  }

  // Helper function to build prompt from video_prompt_veo3
  const buildFromVeo3 = (vp: NonNullable<typeof rawData.video_prompt_veo3>): string | null => {
    const parts: string[] = [];

    // Subject (character description with 15+ attributes)
    if (vp.subject) parts.push(vp.subject);

    // Action (detailed movement sequence)
    if (vp.action) parts.push(vp.action);

    // Scene (environment description)
    if (vp.scene) parts.push(vp.scene);

    // Style (camera work)
    if (vp.style) parts.push(vp.style);

    // Dialogue (Character says: 'text' with tone)
    if (vp.dialogue) parts.push(vp.dialogue);

    // Sounds (Ambient: X. SFX: Y. Foley: Z.)
    if (vp.sounds) parts.push(vp.sounds);

    // Technical (negative prompts)
    if (vp.technical) parts.push(vp.technical);

    return parts.length > 0 ? parts.join(". ") : null;
  };

  // Priority 1a: Use video_prompt_veo3 at scene level (7-component format)
  if (rawData.video_prompt_veo3) {
    const prompt = buildFromVeo3(rawData.video_prompt_veo3);
    if (prompt) return prompt;
  }

  // Priority 1b: Use video_prompt_veo3 from first shot (n8n generates it per shot)
  if (rawData.shots && rawData.shots.length > 0) {
    const firstShot = rawData.shots[0];
    if (firstShot.video_prompt_veo3) {
      const prompt = buildFromVeo3(firstShot.video_prompt_veo3);
      if (prompt) return prompt;
    }
  }

  // Priority 2: Use first shot's action_prompt if available
  if (rawData.shots && rawData.shots.length > 0) {
    const firstShot = rawData.shots[0];
    if (firstShot.action_prompt) {
      const parts: string[] = [firstShot.action_prompt];

      // Add dialogue if present
      if (firstShot.dialogue_segment) {
        parts.push(`Dialogue: "${firstShot.dialogue_segment}"`);
      }

      // Add composition instruction
      if (firstShot.composition_instruction) {
        parts.push(firstShot.composition_instruction);
      }

      return parts.join(". ");
    }
  }

  // Priority 3: Legacy fields - collect ACTION parts first (not audio)
  const actionParts: string[] = [];

  // Action description - core of what happens
  const action = rawData.action_description || rawData.action_summary;
  if (action) {
    actionParts.push(action);
  }

  // Also try action_text from scene table
  if (actionParts.length === 0 && scene.action_text) {
    actionParts.push(scene.action_text);
  }

  // Shot type (affects camera framing)
  if (rawData.shot_type) {
    actionParts.push(rawData.shot_type);
  }

  // Composition instruction (camera movement hints)
  if (rawData.composition_instruction) {
    actionParts.push(rawData.composition_instruction);
  } else if (rawData.visual_mood?.composition) {
    actionParts.push(rawData.visual_mood.composition);
  }

  // Visual atmosphere
  if (rawData.visual_atmosphere) {
    actionParts.push(rawData.visual_atmosphere);
  } else if (rawData.visual_mood?.atmosphere) {
    actionParts.push(rawData.visual_mood.atmosphere);
  }

  // Add dialogue snippet if present
  if (rawData.dialogue_snippet) {
    actionParts.push(`Dialogue: "${rawData.dialogue_snippet}"`);
  }

  // Priority 4: If NO action data, construct from available fields
  if (actionParts.length === 0) {
    // Start with slugline as scene description
    const slugline = rawData.slugline || scene.slugline;
    if (slugline) {
      actionParts.push(slugline);
    }

    // Add characters doing something in the scene
    const characters = rawData.bible_character_ids || rawData.characters_present;
    if (characters && characters.length > 0) {
      const charNames = characters.map(c =>
        typeof c === 'string' ? c : (c as { name?: string }).name || 'Character'
      ).join(' and ');
      actionParts.push(`${charNames} in the scene`);
    }

    // Add location context
    const location = rawData.bible_location_id || rawData.location;
    if (location) {
      actionParts.push(`Location: ${location}`);
    }

    // Add time of day
    if (rawData.time_of_day) {
      actionParts.push(`Time: ${rawData.time_of_day}`);
    }

    // Add dialogue transcript as narration hint
    const dialogueTranscript = rawData.audio_requirements?.dialogue_transcript;
    if (dialogueTranscript) {
      actionParts.push(`Narration: "${dialogueTranscript.substring(0, 200)}"`);
    }
  }

  // Now add audio hints (secondary to action)
  const audioParts: string[] = [];
  const audio = rawData.audio_requirements;
  if (audio) {
    if (audio.ambient) {
      const ambientStr = Array.isArray(audio.ambient) ? audio.ambient.join(", ") : audio.ambient;
      audioParts.push(`Ambient: ${ambientStr}`);
    }
    if (audio.sfx) {
      const sfxStr = Array.isArray(audio.sfx) ? audio.sfx.join(", ") : audio.sfx;
      audioParts.push(`SFX: ${sfxStr}`);
    }
    if (audio.music_mood) {
      audioParts.push(`Music: ${audio.music_mood}`);
    }
  }

  // Combine: action first, then audio
  const allParts = [...actionParts];
  if (audioParts.length > 0) {
    allParts.push(audioParts.join(". "));
  }

  return allParts.join(". ") || scene.slugline || "Generate video";
}
