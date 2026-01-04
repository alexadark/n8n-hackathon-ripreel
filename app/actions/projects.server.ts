"use server";

import { createClient as createSupabase } from "@supabase/supabase-js";
import { generateBible, generateScenes, type ParseScriptResult, type ApiKeys } from "@/lib/n8n";

// Helper to create Supabase client with service role key (demo mode - no auth)
function getStorageClient() {
  return createSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Alias for legacy code that uses createClient
const createClient = getStorageClient;
import { db } from "@/lib/drizzle/db.server";
import {
  projects,
  scenes as scenesTable,
  projectCharacters,
  projectLocations,
  projectProps,
  type NewScene,
  type RawSceneData,
  type StyleConfig,
} from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { getVisualStyleById, getVisualStyleBySlug } from "./visual-styles.server";

// Helper to map n8n character tier to database role enum
function mapTierToRole(tier: string | undefined): 'lead' | 'supporting' | 'background' {
  if (!tier) return 'supporting';
  const tierLower = tier.toLowerCase();
  if (tierLower.includes('1') || tierLower.includes('main')) return 'lead';
  if (tierLower.includes('2') || tierLower === 'supporting') return 'supporting';
  if (tierLower.includes('3') || tierLower.includes('extra')) return 'background';
  return 'supporting';
}

export type CreateProjectResult =
  | {
      success: true;
      projectId: string;
      status: "bible_review" | "scene_validation" | "parsing";
      scenes?: Array<Record<string, unknown>>;
    }
  | {
      success: false;
      error: string;
    };

export type UploadScriptPayload = {
  projectName: string;
  scriptContent: string; // For text input
  fileData?: ArrayBuffer; // For PDF upload (legacy - direct call)
  fileDataBase64?: string; // For PDF upload via RPC (base64 encoded)
  // New: Style selection via database ID
  visualStyleId?: string;
  // New: Custom style config for "use without saving"
  customStyleConfig?: StyleConfig;
  // Legacy: Keep for backward compatibility during migration
  visualStyle?: string;
  isPdf: boolean;
  fileName?: string;
  autoMode?: boolean; // Auto-generate Bible assets after parsing
  apiKeys?: ApiKeys; // User-provided API keys from localStorage
};

/**
 * Create a new project and trigger n8n screenplay parsing
 * This server action handles:
 * 1. Creating the project record in the database
 * 2. Uploading the screenplay to Supabase Storage (if PDF)
 * 3. Sending the screenplay to n8n for parsing
 * 4. Storing the parsed scenes (optional - can be done via webhook callback)
 */
export async function createProject(
  payload: UploadScriptPayload
): Promise<CreateProjectResult> {
  try {
    // Debug: Log received API keys
    console.log('🔐 Server Action received apiKeys:', {
      hasApiKeys: !!payload.apiKeys,
      anthropicPresent: !!payload.apiKeys?.anthropic,
      anthropicLength: payload.apiKeys?.anthropic?.length || 0,
      kiePresent: !!payload.apiKeys?.kie,
      kieLength: payload.apiKeys?.kie?.length || 0,
    });

    // Get authenticated user (for Supabase storage)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // For storage uploads in demo mode, use service role key to bypass RLS
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const storageClient = createSupabaseClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate storage path for screenplay
    const timestamp = Date.now();
    const userId = user?.id || "anonymous";
    const storagePath = `${userId}/${timestamp}/${payload.fileName || "script.txt"}`;

    // Store screenplay content in Supabase Storage
    let storageUrl: string | null = null;

    // Handle file data: either direct ArrayBuffer or base64 encoded (from RPC)
    let fileBuffer: Buffer | ArrayBuffer | null = null;
    if (payload.fileDataBase64) {
      // Decode base64 to Buffer (from RPC call)
      fileBuffer = Buffer.from(payload.fileDataBase64, "base64");
    } else if (payload.fileData) {
      // Use ArrayBuffer directly (from direct call)
      fileBuffer = payload.fileData;
    }

    const uploadData = payload.isPdf && fileBuffer
      ? fileBuffer
      : payload.scriptContent;

    console.log("📤 Attempting upload to Supabase Storage:", {
      path: storagePath,
      isPdf: payload.isPdf,
      hasFileData: !!fileBuffer,
      dataSize: fileBuffer ? (fileBuffer instanceof Buffer ? fileBuffer.length : fileBuffer.byteLength) : payload.scriptContent.length,
    });

    const { data: uploadData2, error: uploadError } = await storageClient.storage
      .from("pdfs")
      .upload(storagePath, uploadData, {
        contentType: payload.isPdf ? "application/pdf" : "text/plain",
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      // For PDFs, we MUST have the storage URL - fail if upload fails
      if (payload.isPdf) {
        return {
          success: false,
          error: `Failed to upload PDF to storage: ${uploadError.message}`,
        };
      }
      // For text, continue with the text content
    } else if (uploadData2) {
      // Get public URL for the uploaded file
      const { data: urlData } = storageClient.storage
        .from("pdfs")
        .getPublicUrl(uploadData2.path);
      storageUrl = urlData.publicUrl;
      console.log("✅ Uploaded to Supabase Storage:", storageUrl);
    }

    // =========================================================================
    // STEP 0: Load style configuration
    // =========================================================================
    let styleConfig: StyleConfig | null = null;
    let visualStyleId: string | null = null;
    let visualStyleSlug = "classic-noir"; // Default slug

    // Priority: customStyleConfig > visualStyleId > visualStyle (legacy)
    if (payload.customStyleConfig) {
      // Using custom config (not saved) - generate a unique slug
      styleConfig = payload.customStyleConfig;
      visualStyleSlug = `custom-${Date.now()}`;
      console.log("📐 Using custom style config (unsaved):", visualStyleSlug);
    } else if (payload.visualStyleId) {
      // Load from database by ID
      const style = await getVisualStyleById(payload.visualStyleId);
      if (style) {
        styleConfig = style.style_config;
        visualStyleId = style.id;
        visualStyleSlug = style.slug;
        console.log("📐 Loaded style config from database:", style.name);
      }
    } else if (payload.visualStyle) {
      // Legacy: Load by slug
      const style = await getVisualStyleBySlug(payload.visualStyle);
      if (style) {
        styleConfig = style.style_config;
        visualStyleId = style.id;
        visualStyleSlug = style.slug;
        console.log("📐 Loaded style config by slug:", style.name);
      }
    }

    // Fallback to classic-noir if no style found
    if (!styleConfig) {
      const defaultStyle = await getVisualStyleBySlug("classic-noir");
      if (defaultStyle) {
        styleConfig = defaultStyle.style_config;
        visualStyleId = defaultStyle.id;
        visualStyleSlug = defaultStyle.slug;
        console.log("📐 Using default style: Classic Film Noir");
      } else {
        return {
          success: false,
          error: "No visual style configuration found",
        };
      }
    }

    // Create project in database
    const [project] = await db
      .insert(projects)
      .values({
        title: payload.projectName,
        screenplay_filename: payload.fileName || "script.txt",
        screenplay_storage_path: storagePath,
        // Style slug (now text, not enum - supports any style)
        visual_style: visualStyleSlug,
        // FK to visual_styles table (null for unsaved custom styles)
        visual_style_id: visualStyleId,
        status: "parsing",
        auto_mode: payload.autoMode ?? false,
      })
      .returning();

    if (!project) {
      return {
        success: false,
        error: "Failed to create project",
      };
    }

    // =========================================================================
    // STEP 1: Generate Bible (characters, locations, props) - ~2.5 min
    // =========================================================================
    console.log("📖 STEP 1: Generating Bible data...");
    const scriptContent = payload.isPdf && storageUrl ? storageUrl : payload.scriptContent;

    const bibleResult = await generateBible({
      script_content: scriptContent,
      visual_style: visualStyleSlug,
      style_config: styleConfig,
      is_pdf: payload.isPdf,
      project_id: project.id,
      user_id: userId,
    }, payload.apiKeys);

    console.log("📖 Bible generation result:", {
      success: bibleResult.success,
      charactersCount: bibleResult.data?.characters?.length || 0,
      locationsCount: bibleResult.data?.locations?.length || 0,
      propsCount: bibleResult.data?.props?.length || 0,
      inlineCharactersCount: bibleResult.data?.inline_characters?.length || 0,
    });

    if (!bibleResult.success || !bibleResult.data) {
      // Update project status to failed
      await db
        .update(projects)
        .set({ status: "failed" })
        .where(eq(projects.id, project.id));

      return {
        success: false,
        error: bibleResult.error || "Failed to generate Bible data",
      };
    }

    // Convert Bible result to ParseScriptResult format for existing code
    const parseResult: ParseScriptResult = {
      success: true,
      bible: {
        characters: bibleResult.data.characters.map((char) => ({
          name: char.name,
          role: char.role || "supporting",
          visual_dna: char.visual_dna_reference || char.visual_dna,
          img_portrait_prompt: char.portrait_prompt_seedream || char.img_portrait_prompt,
          img_three_quarter_prompt: char.three_quarter_prompt_seedream || char.img_three_quarter_prompt,
          img_full_body_prompt: char.full_body_prompt_seedream || char.img_full_body_prompt,
          // Model-specific prompts from n8n (MUST be passed through for distinct generation)
          portrait_prompt_seedream: char.portrait_prompt_seedream,
          portrait_prompt_nano_banana: char.portrait_prompt_nano_banana,
        })),
        locations: bibleResult.data.locations.map((loc) => ({
          name: loc.name,
          visual_dna: loc.visual_dna,
          visual_description: loc.prompt_seedream || loc.prompt_nano_banana,
        })),
        props: bibleResult.data.props.map((prop) => ({
          name: prop.name,
          importance: prop.generation_method === "GENERATE" ? "high" : "medium",
          visual_dna: prop.visual_dna,
          visual_description: prop.prompt_seedream || prop.prompt_nano_banana,
        })),
      },
      scenes: undefined, // Will be populated in Step 2
    };

    console.log("🎬 Parse result from Bible generation:", {
      success: parseResult.success,
      hasBible: !!parseResult.bible,
      hasScenes: !!parseResult.scenes,
      charactersCount: parseResult.bible?.characters?.length || 0,
      locationsCount: parseResult.bible?.locations?.length || 0,
      propsCount: parseResult.bible?.props?.length || 0,
      sceneCount: parseResult.scenes?.length || 0,
    });

    // Store Bible assets if present
    if (parseResult.bible) {
      console.log("📖 Storing Bible assets in database");

      // Store characters (MVP Simplification: portrait only)
      if (parseResult.bible.characters && parseResult.bible.characters.length > 0) {
        await db.insert(projectCharacters).values(
          parseResult.bible.characters.map((char) => ({
            project_id: project.id,
            name: char.name,
            // Map tier to role enum: TIER 1/main → lead, TIER 2/supporting → supporting, TIER 3/extra → background
            role: mapTierToRole(char.tier),
            // MVP: Portrait prompt only (no three_quarter or full_body)
            visual_dna: char.visual_dna_reference || char.visual_dna || char.img_portrait_prompt || 'Character visual description',
            portrait_prompt: char.img_portrait_prompt || null,
            // Model-specific prompts from n8n (each AI model is prompted differently)
            portrait_prompt_seedream: char.portrait_prompt_seedream || char.img_portrait_prompt || null,
            portrait_prompt_nano_banana: char.portrait_prompt_nano_banana || char.img_portrait_prompt || null,
            backstory: char.backstory || null,
            raw_data: {
              emotional_archetype: char.emotional_archetype,
              first_appearance: char.first_appearance,
            },
          }))
        );
        console.log(`✅ Stored ${parseResult.bible.characters.length} characters`);
      }

      // Store locations
      if (parseResult.bible.locations && parseResult.bible.locations.length > 0) {
        await db.insert(projectLocations).values(
          parseResult.bible.locations.map((loc) => ({
            project_id: project.id,
            name: loc.name,
            // Handle missing type - infer from name or default to exterior
            type: loc.type === "INT" ? "interior" as const :
                  loc.type === "EXT" ? "exterior" as const :
                  loc.name.toLowerCase().includes("int") ? "interior" as const : "exterior" as const,
            // Use visual_dna if visual_description is missing (n8n returns visual_dna)
            visual_description: loc.visual_description || (loc as { visual_dna?: string }).visual_dna || "",
            time_variants: loc.time_variants || null,
            raw_data: {
              atmosphere: loc.atmosphere,
            },
          }))
        );
        console.log(`✅ Stored ${parseResult.bible.locations.length} locations`);
      }

      // Store props
      if (parseResult.bible.props && parseResult.bible.props.length > 0) {
        await db.insert(projectProps).values(
          parseResult.bible.props.map((prop) => ({
            project_id: project.id,
            name: prop.name,
            // Normalize importance to lowercase, default to medium if missing
            importance: (prop.importance?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
            // Use visual_dna if visual_description is missing (n8n returns visual_dna)
            visual_description: prop.visual_description || (prop as { visual_dna?: string }).visual_dna || "",
          }))
        );
        console.log(`✅ Stored ${parseResult.bible.props.length} props`);
      }

      // Auto-generate Bible images if auto_mode is enabled
      if (payload.autoMode) {
        console.log("🚀 Auto mode enabled - triggering parallel Bible asset generation...");
        // Import and call auto-generation (fire and forget)
        const { autoGenerateBibleAssets } = await import('./auto-mode.server');
        autoGenerateBibleAssets(project.id).catch((error) => {
          console.error("❌ Auto-generation error (non-blocking):", error);
        });
        console.log("✅ Auto-generation triggered (running in background)");
      }
    }

    // =========================================================================
    // STEP 2: Generate Scenes (using Bible data) - RUNS IN BACKGROUND
    // =========================================================================
    // Scene generation takes ~3 min, so we run it in background to not block the UI
    // User sees Bible page immediately and can start reviewing while scenes generate
    console.log("🎬 STEP 2: Triggering scene generation in background...");

    // Fire-and-forget: run scene generation in background
    // IMPORTANT: Use scriptContent (which is storageUrl for PDFs) not payload.scriptContent
    generateScenesInBackground(
      project.id,
      scriptContent, // Fixed: was payload.scriptContent which is empty for PDFs
      visualStyleSlug,
      styleConfig,
      bibleResult.data,
      payload.apiKeys,
      payload.isPdf // Tell n8n to download and extract PDF text
    ).catch((error) => {
      console.error("❌ Background scene generation error (non-blocking):", error);
    });
    console.log("✅ Scene generation triggered (running in background)");

    // NOTE: Scenes are stored by generateScenesInBackground when they're ready
    // We don't wait for them here - user can see Bible page immediately

    // Set project status to bible_review (scenes will be available when background job completes)
    const newStatus = "bible_review";
    console.log("✅ Project status set to bible_review (scenes generating in background)");

    await db
      .update(projects)
      .set({ status: newStatus })
      .where(eq(projects.id, project.id));

    return {
      success: true,
      projectId: project.id,
      status: newStatus,
    };
  } catch (error) {
    console.error("Error creating project:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Upload PDF to Supabase Storage and return the public URL
 */
export async function uploadPdfToStorage(
  file: File,
  projectId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Upload to Supabase Storage
    const filePath = `${user.id}/${projectId}/${file.name}`;
    const { data, error } = await supabase.storage
      .from("pdfs")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("pdfs").getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Extract text from PDF file using FileReader
 * Note: For production, you might want to use a server-side PDF parser
 * or send to n8n for extraction
 */
export async function extractTextFromPdf(
  file: File
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  try {
    // For now, we'll just read the file as text
    // In production, you'd use a proper PDF parser
    const text = await file.text();

    if (!text || text.length === 0) {
      return {
        success: false,
        error: "No text found in PDF",
      };
    }

    return {
      success: true,
      text,
    };
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract text",
    };
  }
}

/**
 * Update scene data (slugline and action description)
 */
export async function updateScene(
  sceneId: string,
  updates: {
    slugline?: string;
    action_description?: string;
    location?: string;
    time_of_day?: string;
    duration_estimate?: number;
    dialogue_snippet?: string;
    image_generation_prompt?: string;
    production_notes?: string;
    characters_present?: string[];
    props_and_materials?: string[];
    visual_mood?: {
      lighting?: string;
      atmosphere?: string;
      composition?: string;
      color_palette?: string;
    };
    audio_requirements?: {
      music_mood?: string;
      dialogue_tone?: string;
      ambient?: string[];
      sfx?: string[];
    };
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("💾 Updating scene:", { sceneId, updates });

    // Get existing scene to preserve full_data
    const [existingScene] = await db
      .select()
      .from(scenesTable)
      .where(eq(scenesTable.id, sceneId))
      .limit(1);

    if (!existingScene) {
      return {
        success: false,
        error: "Scene not found",
      };
    }

    // Update scene with new data
    const updateData: Partial<NewScene> = {
      user_edits: JSON.stringify(updates),
    };

    // Also update the basic fields for backward compatibility
    if (updates.slugline) {
      updateData.slugline = updates.slugline;
    }
    if (updates.action_description) {
      updateData.action_text = updates.action_description;
    }
    // Note: duration_estimate is stored in full_data, not as a direct column

    // Update full_data to reflect changes
    if (existingScene.full_data) {
      updateData.full_data = {
        ...existingScene.full_data,
        slugline: updates.slugline ?? existingScene.full_data.slugline,
        action_description: updates.action_description ?? existingScene.full_data.action_description,
        location: updates.location ?? existingScene.full_data.location,
        time_of_day: updates.time_of_day ?? existingScene.full_data.time_of_day,
        duration_estimate: updates.duration_estimate ?? existingScene.full_data.duration_estimate,
        dialogue_snippet: updates.dialogue_snippet ?? existingScene.full_data.dialogue_snippet,
        image_generation_prompt: updates.image_generation_prompt ?? existingScene.full_data.image_generation_prompt,
        production_notes: updates.production_notes ?? existingScene.full_data.production_notes,
        characters_present: updates.characters_present ?? existingScene.full_data.characters_present,
        props_and_materials: updates.props_and_materials ?? existingScene.full_data.props_and_materials,
        visual_mood: updates.visual_mood ? {
          ...existingScene.full_data.visual_mood,
          ...updates.visual_mood,
        } : existingScene.full_data.visual_mood,
        audio_requirements: updates.audio_requirements ? {
          ...existingScene.full_data.audio_requirements,
          ...updates.audio_requirements,
        } : existingScene.full_data.audio_requirements,
      };
    }

    await db
      .update(scenesTable)
      .set(updateData)
      .where(eq(scenesTable.id, sceneId));

    console.log("✅ Scene updated successfully");

    return { success: true };
  } catch (error) {
    console.error("❌ Error updating scene:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update scene",
    };
  }
}

/**
 * Delete a project and all associated data
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🗑️ Deleting project:", projectId);

    // Delete associated scenes first (foreign key constraint)
    await db.delete(scenesTable).where(eq(scenesTable.project_id, projectId));
    console.log("✅ Scenes deleted");

    // Delete the project
    await db.delete(projects).where(eq(projects.id, projectId));
    console.log("✅ Project deleted");

    // TODO: Delete associated files from Supabase Storage
    // - screenplay PDFs
    // - generated images
    // - generated videos
    // - generated audio
    // - final reels

    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}

/**
 * Generate scenes in background (non-blocking)
 * Called from createProject after Bible generation completes
 * Stores scenes directly in database when ready
 */
async function generateScenesInBackground(
  projectId: string,
  scriptContent: string,
  visualStyle: string,
  styleConfig: StyleConfig,
  bibleData: {
    characters: Array<{ name: string; role?: string; visual_dna?: string; visual_dna_reference?: string }>;
    locations: Array<{ name: string; visual_dna?: string }>;
    props: Array<{ name: string; visual_dna?: string; importance?: string }>;
  },
  apiKeys?: ApiKeys,
  isPdf?: boolean
): Promise<void> {
  try {
    console.log("🎬 [Background] Starting scene generation for project:", projectId);

    // Call n8n scene generation workflow
    const sceneResult = await generateScenes({
      script_content: scriptContent,
      visual_style: visualStyle, // Legacy field
      style_config: styleConfig, // NEW: Full style configuration
      is_pdf: isPdf, // Tell n8n to download and extract PDF text
      project_id: projectId,
      bible_data: {
        characters: bibleData.characters.map((c) => ({
          name: c.name,
          role: c.role || "supporting",
          visual_dna: c.visual_dna_reference || c.visual_dna || "",
        })),
        locations: bibleData.locations.map((l) => ({
          name: l.name,
          visual_dna: l.visual_dna || "",
        })),
        props: bibleData.props.map((p) => ({
          name: p.name,
          importance: p.importance || "medium",
          visual_dna: p.visual_dna || "",
        })),
      },
    }, apiKeys);

    const scenes = sceneResult.data?.scenes;

    console.log("🎬 [Background] Scene generation result:", {
      success: sceneResult.success,
      sceneCount: scenes?.length || 0,
    });

    if (!sceneResult.success || !scenes || scenes.length === 0) {
      console.error("❌ [Background] Scene generation failed:", sceneResult.error);
      // Keep at bible_review, user can retry
      return;
    }

    // Store scenes in database
    console.log("💾 [Background] Storing", scenes.length, "scenes...");

    const sceneValues = scenes.map((scene: Record<string, unknown>, index: number) => {
      // Handle both orchestrator format and legacy format
      // Orchestrator: scene.shots[0] contains composition_instruction_seedream, etc.
      // Legacy: scene has composition_instruction at scene level
      const shots = scene.shots as Array<Record<string, unknown>> | undefined;
      const firstShot = shots?.[0];

      // Extract video_prompt_veo3 - check scene level first, then first shot
      const videoPrompt = (scene.video_prompt_veo3 as Record<string, unknown> | undefined)
                       || (firstShot?.video_prompt_veo3 as Record<string, unknown> | undefined);
      const actionFromVeo = videoPrompt?.action as string | undefined;

      // Build RawSceneData with proper field mapping
      // IMPORTANT: Always use index + 1 for scene_number to ensure sequential numbering
      // n8n may return incorrect scene_number values (e.g., 2, 4, 6 instead of 1, 2, 3)
      const rawSceneData: RawSceneData = {
        scene_number: index + 1,
        slugline: (scene.slugline as string) || `Scene ${index + 1}`,
        time_of_day: (scene.time_of_day as string) || "",
        interior_exterior: (scene.slugline as string)?.startsWith("INT") ? "INT" : "EXT",

        // Location - orchestrator uses bible_location_id
        location: scene.bible_location_id as string,
        bible_location_id: scene.bible_location_id as string,

        // Characters - orchestrator uses bible_character_ids
        characters_present: scene.bible_character_ids as string[],
        bible_character_ids: scene.bible_character_ids as string[],

        // Props - orchestrator uses bible_prop_ids
        props_used: scene.bible_prop_ids as string[],
        bible_prop_ids: scene.bible_prop_ids as string[],

        // Action - extract from video_prompt_veo3.action in first shot, or use main_subject_ref
        action_description: actionFromVeo || (scene.main_subject_ref as string) || "",

        // Dialogue - extract from audio_requirements or first shot
        dialogue_snippet: (scene.audio_requirements as Record<string, unknown>)?.dialogue_transcript as string,

        // Visual mood from orchestrator
        visual_mood: {
          atmosphere: scene.visual_atmosphere as string,
        },

        // Audio requirements
        audio_requirements: scene.audio_requirements as RawSceneData["audio_requirements"],

        // Image generation fields - extract from first shot
        main_subject_ref: scene.main_subject_ref as string,
        wardrobe_description: scene.wardrobe_description as string,
        visual_atmosphere: scene.visual_atmosphere as string,
        shot_type: (firstShot?.shot_type as string) || "",

        // Model-specific composition prompts from first shot
        composition_instruction_seedream: firstShot?.composition_instruction_seedream as string,
        composition_instruction_nano_banana: firstShot?.composition_instruction_nano_banana as string,

        // Generic composition instruction (use seedream as default)
        composition_instruction: (firstShot?.composition_instruction_seedream as string) ||
                                  (firstShot?.composition_instruction_nano_banana as string),

        // Inline characters for this scene
        inline_characters: scene.inline_character_ids as RawSceneData["inline_characters"],

        // Shot-based video generation
        estimated_duration_seconds: scene.estimated_duration_seconds as number,
        requires_extend: scene.requires_extend as boolean,
        shots: shots as RawSceneData["shots"],

        // Veo 3.1 video prompt from first shot
        video_prompt_veo3: videoPrompt as RawSceneData["video_prompt_veo3"],
      };

      return {
        project_id: projectId,
        scene_number: rawSceneData.scene_number,
        slugline: rawSceneData.slugline,
        action_text: rawSceneData.action_description || rawSceneData.main_subject_ref || "",
        characters: rawSceneData.characters_present || rawSceneData.bible_character_ids || [],
        raw_scene_data: rawSceneData,
        validation_status: "pending" as const,
      };
    });

    await db.insert(scenesTable).values(sceneValues);

    // Update project with scene order
    const sceneOrder = sceneValues.map((_, idx: number) => idx + 1);
    await db
      .update(projects)
      .set({
        scene_order: sceneOrder,
        // Keep at bible_review (scenes ready for when user navigates to Scenes tab)
      })
      .where(eq(projects.id, projectId));

    console.log("✅ [Background] Scenes stored successfully:", scenes.length, "scenes");
  } catch (error) {
    console.error("❌ [Background] Scene generation error:", error);
    // Don't update project status - keep at bible_review
    // User can see Bible page and scenes will be empty (they can manually trigger later if needed)
  }
}

/**
 * Regenerate scenes for a project
 *
 * Use this when scene generation failed or needs to be retried.
 * Fetches the PDF content from storage, Bible data from DB, and triggers n8n workflow.
 */
export async function regenerateScenes(
  projectId: string,
  apiKeys?: ApiKeys
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🔄 Regenerating scenes for project:", projectId);

    // 1. Get project with style info
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // 2. Get PDF content from storage
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const storageClient = createSupabaseClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the public URL for the PDF
    const { data: urlData } = storageClient.storage
      .from("pdfs")
      .getPublicUrl(project.screenplay_storage_path || "");

    const scriptContent = urlData?.publicUrl || "";

    if (!scriptContent) {
      return { success: false, error: "Could not retrieve screenplay from storage" };
    }

    console.log("📄 Retrieved screenplay URL:", scriptContent);

    // 3. Get Bible data from database
    const [characters, locations, props] = await Promise.all([
      db.select().from(projectCharacters).where(eq(projectCharacters.project_id, projectId)),
      db.select().from(projectLocations).where(eq(projectLocations.project_id, projectId)),
      db.select().from(projectProps).where(eq(projectProps.project_id, projectId)),
    ]);

    const bibleData = {
      characters: characters.map((c) => ({
        name: c.name,
        role: c.role || "supporting",
        visual_dna: c.visual_dna || "",
      })),
      locations: locations.map((l) => ({
        name: l.name,
        visual_dna: l.visual_description || "",
      })),
      props: props.map((p) => ({
        name: p.name,
        importance: p.importance || "medium",
        visual_dna: p.visual_description || "",
      })),
    };

    console.log("📖 Bible data loaded:", {
      characters: characters.length,
      locations: locations.length,
      props: props.length,
    });

    // 4. Get style config
    let styleConfig: StyleConfig | null = null;

    if (project.visual_style_id) {
      const style = await getVisualStyleById(project.visual_style_id);
      if (style) {
        styleConfig = style.style_config;
      }
    } else if (project.visual_style) {
      const style = await getVisualStyleBySlug(project.visual_style);
      if (style) {
        styleConfig = style.style_config;
      }
    }

    // Fallback to classic-noir
    if (!styleConfig) {
      const defaultStyle = await getVisualStyleBySlug("classic-noir");
      if (defaultStyle) {
        styleConfig = defaultStyle.style_config;
      }
    }

    if (!styleConfig) {
      return { success: false, error: "Could not load visual style configuration" };
    }

    // 5. Clear existing scenes (if any)
    await db.delete(scenesTable).where(eq(scenesTable.project_id, projectId));
    console.log("🗑️ Cleared existing scenes");

    // 6. Trigger scene generation (synchronous - wait for result)
    console.log("🎬 Triggering scene generation...");

    // Detect if it's a PDF from the URL or filename
    const isPdf = scriptContent.toLowerCase().endsWith('.pdf') ||
                  project.screenplay_filename?.toLowerCase().endsWith('.pdf') ||
                  false;

    const sceneResult = await generateScenes({
      script_content: scriptContent,
      visual_style: project.visual_style || "classic-noir",
      style_config: styleConfig,
      is_pdf: isPdf, // Tell n8n to download and extract PDF text
      project_id: projectId,
      bible_data: bibleData,
    }, apiKeys);

    const scenes = sceneResult.data?.scenes;

    if (!sceneResult.success || !scenes || scenes.length === 0) {
      console.error("❌ Scene generation failed:", sceneResult.error);
      return {
        success: false,
        error: sceneResult.error || "Scene generation returned no scenes"
      };
    }

    console.log("✅ Generated", scenes.length, "scenes");

    // 7. Store scenes in database (same logic as generateScenesInBackground)
    const sceneValues = scenes.map((scene: Record<string, unknown>, index: number) => {
      const shots = scene.shots as Array<Record<string, unknown>> | undefined;
      const firstShot = shots?.[0];
      const videoPrompt = (scene.video_prompt_veo3 as Record<string, unknown> | undefined)
                       || (firstShot?.video_prompt_veo3 as Record<string, unknown> | undefined);
      const actionFromVeo = videoPrompt?.action as string | undefined;

      // IMPORTANT: Always use index + 1 for scene_number to ensure sequential numbering
      // n8n may return incorrect scene_number values (e.g., 2, 4, 6 instead of 1, 2, 3)
      const rawSceneData: RawSceneData = {
        scene_number: index + 1,
        slugline: (scene.slugline as string) || `Scene ${index + 1}`,
        time_of_day: (scene.time_of_day as string) || "",
        interior_exterior: (scene.slugline as string)?.startsWith("INT") ? "INT" : "EXT",
        location: scene.bible_location_id as string,
        bible_location_id: scene.bible_location_id as string,
        characters_present: scene.bible_character_ids as string[],
        bible_character_ids: scene.bible_character_ids as string[],
        props_used: scene.bible_prop_ids as string[],
        bible_prop_ids: scene.bible_prop_ids as string[],
        action_description: actionFromVeo || (scene.main_subject_ref as string) || "",
        dialogue_snippet: (scene.audio_requirements as Record<string, unknown>)?.dialogue_transcript as string,
        visual_mood: {
          atmosphere: scene.visual_atmosphere as string,
        },
        audio_requirements: scene.audio_requirements as RawSceneData["audio_requirements"],
        main_subject_ref: scene.main_subject_ref as string,
        wardrobe_description: scene.wardrobe_description as string,
        visual_atmosphere: scene.visual_atmosphere as string,
        shot_type: (firstShot?.shot_type as string) || "",
        composition_instruction_seedream: firstShot?.composition_instruction_seedream as string,
        composition_instruction_nano_banana: firstShot?.composition_instruction_nano_banana as string,
        composition_instruction: (firstShot?.composition_instruction_seedream as string) ||
                                  (firstShot?.composition_instruction_nano_banana as string),
        inline_characters: scene.inline_character_ids as RawSceneData["inline_characters"],
        estimated_duration_seconds: scene.estimated_duration_seconds as number,
        requires_extend: scene.requires_extend as boolean,
        shots: shots as RawSceneData["shots"],
        video_prompt_veo3: videoPrompt as RawSceneData["video_prompt_veo3"],
      };

      return {
        project_id: projectId,
        scene_number: rawSceneData.scene_number,
        slugline: rawSceneData.slugline,
        action_text: rawSceneData.action_description || rawSceneData.main_subject_ref || "",
        characters: rawSceneData.characters_present || rawSceneData.bible_character_ids || [],
        raw_scene_data: rawSceneData,
        validation_status: "pending" as const,
      };
    });

    await db.insert(scenesTable).values(sceneValues);

    // Update project with scene order
    const sceneOrder = sceneValues.map((_, idx: number) => idx + 1);
    await db
      .update(projects)
      .set({ scene_order: sceneOrder })
      .where(eq(projects.id, projectId));

    console.log("✅ Scenes stored successfully:", scenes.length, "scenes");

    return { success: true };
  } catch (error) {
    console.error("❌ Error regenerating scenes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate scenes",
    };
  }
}

