import type { Route } from "./+types/api.webhooks.n8n.bible-parsed";
import { db } from "@/lib/drizzle/db.server";
import {
  projects,
  scenes,
  projectCharacters,
  projectLocations,
  projectProps,
} from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import type { RawSceneData } from "@/lib/drizzle/schema/scenes";

/**
 * Bible data structure from n8n Stage 1 parsing
 * Supports new character tier system:
 * - main: Full Bible (3 shots)
 * - supporting: Bible (portrait only)
 * - extra: NO Bible (inline description in scenes)
 *
 * Note: n8n outputs FLAT structure for prompts (not nested)
 */
interface BibleCharacter {
  name: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3"; // From n8n classification
  role: string;
  scene_count: number;
  visual_dna_reference: string; // Model-agnostic description
  // Flat prompt structure from n8n Anthropic Structured Outputs
  portrait_prompt_seedream: string;
  portrait_prompt_nano_banana: string;
  three_quarter_prompt_seedream: string; // "" for TIER_2
  three_quarter_prompt_nano_banana: string; // "" for TIER_2
  full_body_prompt_seedream: string; // "" for TIER_2
  full_body_prompt_nano_banana: string; // "" for TIER_2
  // Legacy fields for backward compatibility
  visual_dna?: string;
  emotional_archetype?: string;
  first_appearance?: number;
  backstory?: string;
}

/**
 * Inline character (Tier 3 extra) - for scene injection only
 */
interface InlineCharacter {
  name: string;
  appears_in_scenes: number[];
  inline_description_seedream: string;
  inline_description_nano_banana: string;
}

interface BibleLocation {
  name: string;
  // n8n outputs visual_dna, not visual_description
  visual_dna: string;
  // Model-specific prompts from n8n
  prompt_seedream: string;
  prompt_nano_banana: string;
  // Legacy field
  visual_description?: string;
  type?: "INT" | "EXT";
  time_variants?: {
    day?: string;
    night?: string;
    dawn?: string;
    dusk?: string;
  };
  atmosphere?: string;
}

interface BibleProp {
  name: string;
  // n8n outputs visual_dna, not visual_description
  visual_dna: string;
  // Model-specific prompts from n8n
  prompt_seedream: string;
  prompt_nano_banana: string;
  // Generation method from n8n classification
  generation_method: "GENERATE" | "DESCRIBE";
  // Scale reference for props (human hand nearby for scale)
  scale_reference: string;
  // Legacy fields
  visual_description?: string;
  importance?: "high" | "medium" | "low";
}

interface BibleData {
  characters: BibleCharacter[];
  inline_characters: InlineCharacter[]; // Tier 3 extras (not stored in project_characters)
  locations: BibleLocation[];
  props: BibleProp[];
}

/**
 * RawScene interface supporting both legacy and N8N workflow field names
 */
interface RawScene {
  scene_number: number;
  slugline: string;
  time_of_day: string;
  interior_exterior: "INT" | "EXT";
  duration_estimate?: number;

  // Location - support both formats
  location?: string;
  bible_location_id?: string;

  // Characters - support both formats
  characters_present?: string[];
  bible_character_ids?: string[];

  // Props - support both formats
  props_used?: string[];
  bible_prop_ids?: string[];

  // Action - support both formats
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
    ambient?: string[];
    sfx?: string[];
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

  // NEW: Model-specific composition prompts
  composition_instruction_seedream?: string;
  composition_instruction_nano_banana?: string;

  // NEW: Inline characters (Tier 3 extras) present in this scene
  inline_characters?: {
    name: string;
    inline_description_seedream: string;
    inline_description_nano_banana: string;
  }[];

  // NEW: Prop injection method - maps prop names to IMAGE_REFERENCE or TEXT_DESCRIBE
  prop_injection_method?: Record<string, "IMAGE_REFERENCE" | "TEXT_DESCRIBE">;

  // NEW: Veo 3.1 video prompt (7-component format)
  video_prompt_veo3?: {
    subject: string;
    action: string;
    scene: string;
    style: string;
    dialogue: string | null;
    sounds: string;
    technical: string;
  };
}

interface BibleParsedPayload {
  project_id: string;
  bible: BibleData;
  raw_scenes: RawScene[];
}

/**
 * Webhook endpoint to receive Bible + raw scenes from n8n Stage 1
 *
 * Expected payload:
 * {
 *   project_id: string;
 *   bible: {
 *     characters: [...],
 *     locations: [...],
 *     props: [...]
 *   },
 *   raw_scenes: [...]
 * }
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body: BibleParsedPayload = await request.json();
    const { project_id, bible, raw_scenes } = body;

    console.log("Received Bible + raw scenes:", {
      project_id,
      characters_count: bible?.characters?.length || 0,
      inline_characters_count: bible?.inline_characters?.length || 0,
      locations_count: bible?.locations?.length || 0,
      props_count: bible?.props?.length || 0,
      scenes_count: raw_scenes?.length || 0,
    });

    // Validate required fields
    if (!project_id) {
      return Response.json(
        { success: false, error: "project_id is required" },
        { status: 400 }
      );
    }

    if (!bible) {
      return Response.json(
        { success: false, error: "bible data is required" },
        { status: 400 }
      );
    }

    if (!raw_scenes || !Array.isArray(raw_scenes)) {
      return Response.json(
        { success: false, error: "raw_scenes array is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, project_id))
      .limit(1);

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Insert characters (only Tier 1: main and Tier 2: supporting)
    // Tier 3 (extras) are NOT stored here - they go in scene inline_characters
    if (bible.characters && bible.characters.length > 0) {
      const characterRecords = bible.characters.map((char) => {
        // Map n8n tier format to database tier
        // Supports both formats: "TIER_1"/"TIER_2"/"TIER_3" and "1"/"2"/"3"
        const tierMap: Record<string, "main" | "supporting" | "extra"> = {
          TIER_1: "main",
          TIER_2: "supporting",
          TIER_3: "extra",
          "1": "main",
          "2": "supporting",
          "3": "extra",
        };
        const tier = tierMap[char.tier] || "supporting";
        const role = tier === "main" ? "lead" : "supporting";

        return {
          project_id,
          name: char.name,
          role: role as "lead" | "supporting" | "background",
          tier,
          scene_count: char.scene_count || 1,
          // Use visual_dna_reference (new) or visual_dna (legacy)
          visual_dna: char.visual_dna_reference || char.visual_dna || "",
          backstory: char.backstory || null,
          // Model-specific prompts for portrait (FLAT structure from n8n)
          portrait_prompt_seedream: char.portrait_prompt_seedream || null,
          portrait_prompt_nano_banana: char.portrait_prompt_nano_banana || null,
          portrait_prompt:
            char.portrait_prompt_seedream ||
            "Professional headshot, medium close-up, face centered",
          // Model-specific prompts for three-quarter (empty string "" for TIER_2)
          three_quarter_prompt_seedream:
            char.three_quarter_prompt_seedream || null,
          three_quarter_prompt_nano_banana:
            char.three_quarter_prompt_nano_banana || null,
          three_quarter_prompt:
            char.three_quarter_prompt_seedream ||
            (tier === "main"
              ? "Three-quarter view medium shot, waist up"
              : null),
          // Model-specific prompts for full body (empty string "" for TIER_2)
          full_body_prompt_seedream: char.full_body_prompt_seedream || null,
          full_body_prompt_nano_banana:
            char.full_body_prompt_nano_banana || null,
          full_body_prompt:
            char.full_body_prompt_seedream ||
            (tier === "main" ? "Full body wide shot, head to toe" : null),
          raw_data: {
            emotional_archetype: char.emotional_archetype,
            first_appearance: char.first_appearance,
          },
        };
      });

      await db.insert(projectCharacters).values(characterRecords);
      const mainCount = characterRecords.filter(
        (c) => c.tier === "main"
      ).length;
      const supportingCount = characterRecords.filter(
        (c) => c.tier === "supporting"
      ).length;
      console.log(
        `Inserted ${characterRecords.length} characters (${mainCount} main, ${supportingCount} supporting)`
      );
    }

    // Log inline characters (Tier 3 extras) - these will be injected into scenes
    if (bible.inline_characters && bible.inline_characters.length > 0) {
      console.log(
        `${bible.inline_characters.length} inline characters (extras) will be injected into scenes`
      );
    }

    // Insert locations
    if (bible.locations && bible.locations.length > 0) {
      const locationRecords = bible.locations.map((loc) => ({
        project_id,
        name: loc.name,
        type:
          loc.type === "INT"
            ? ("interior" as "interior" | "exterior")
            : ("exterior" as "interior" | "exterior"),
        // Use visual_dna (n8n) or visual_description (legacy)
        visual_description: loc.visual_dna || loc.visual_description || "",
        // Model-specific prompts from n8n
        prompt_seedream: loc.prompt_seedream || null,
        prompt_nano_banana: loc.prompt_nano_banana || null,
        time_variants: loc.time_variants || null,
        raw_data: {
          atmosphere: loc.atmosphere,
        },
      }));

      await db.insert(projectLocations).values(locationRecords);
      console.log(`Inserted ${locationRecords.length} locations`);
    }

    // Insert props
    if (bible.props && bible.props.length > 0) {
      const propRecords = bible.props.map((prop) => ({
        project_id,
        name: prop.name,
        importance: (prop.importance || "medium") as "high" | "medium" | "low",
        // Use visual_dna (n8n) or visual_description (legacy)
        visual_description: prop.visual_dna || prop.visual_description || "",
        // Model-specific prompts from n8n
        prompt_seedream: prop.prompt_seedream || null,
        prompt_nano_banana: prop.prompt_nano_banana || null,
        // Generation method and scale reference from n8n
        generation_method: (prop.generation_method || "GENERATE") as
          | "GENERATE"
          | "DESCRIBE",
        scale_reference: prop.scale_reference || null,
        // DESCRIBE props are auto-approved (no image to generate)
        image_status:
          prop.generation_method === "DESCRIBE"
            ? ("approved" as const)
            : ("pending" as const),
      }));

      await db.insert(projectProps).values(propRecords);
      const generateCount = propRecords.filter(
        (p) => p.generation_method === "GENERATE"
      ).length;
      const describeCount = propRecords.filter(
        (p) => p.generation_method === "DESCRIBE"
      ).length;
      console.log(
        `Inserted ${propRecords.length} props (${generateCount} GENERATE, ${describeCount} DESCRIBE)`
      );
    }

    // Insert raw scenes with inline characters
    if (raw_scenes.length > 0) {
      // Build a map of inline characters by scene number
      const inlineCharsByScene: Record<number, typeof bible.inline_characters> =
        {};
      if (bible.inline_characters) {
        for (const inlineChar of bible.inline_characters) {
          for (const sceneNum of inlineChar.appears_in_scenes) {
            if (!inlineCharsByScene[sceneNum]) {
              inlineCharsByScene[sceneNum] = [];
            }
            inlineCharsByScene[sceneNum]!.push(inlineChar);
          }
        }
      }

      const sceneRecords = raw_scenes.map((scene) => {
        // Normalize field names - support both legacy and N8N workflow formats
        const location = scene.location || scene.bible_location_id || "";
        const charactersPresent =
          scene.characters_present || scene.bible_character_ids || [];
        const propsUsed = scene.props_used || scene.bible_prop_ids || [];
        const actionDescription =
          scene.action_description || scene.action_summary || "";

        // Get inline characters for this scene from bible or from scene data
        const sceneInlineChars =
          scene.inline_characters ||
          inlineCharsByScene[scene.scene_number]?.map((ic) => ({
            name: ic.name,
            inline_description_seedream: ic.inline_description_seedream,
            inline_description_nano_banana: ic.inline_description_nano_banana,
          })) ||
          [];

        const rawSceneData: RawSceneData = {
          scene_number: scene.scene_number,
          slugline: scene.slugline || "",
          location,
          time_of_day: scene.time_of_day || "",
          interior_exterior: scene.interior_exterior || "INT",
          duration_estimate: scene.duration_estimate || 30,
          characters_present: charactersPresent,
          props_used: propsUsed,
          action_description: actionDescription,
          dialogue_snippet: scene.dialogue_snippet || "",
          visual_mood: {
            lighting: scene.visual_mood?.lighting || "",
            color_palette: scene.visual_mood?.color_palette || "",
            composition:
              scene.visual_mood?.composition ||
              scene.composition_instruction ||
              "",
            atmosphere:
              scene.visual_mood?.atmosphere || scene.visual_atmosphere || "",
          },
          audio_requirements: {
            ambient: scene.audio_requirements?.ambient || [],
            sfx: scene.audio_requirements?.sfx || [],
            music_mood:
              scene.audio_requirements?.music_mood ||
              scene.audio_requirements?.music ||
              "",
            dialogue_tone: scene.audio_requirements?.dialogue_tone || "",
            dialogue_transcript:
              scene.audio_requirements?.dialogue_transcript || "",
            voice_type: scene.audio_requirements?.voice_type || "",
          },
          production_notes: scene.production_notes,
          // Image generation fields from N8N workflow
          main_subject_ref: scene.main_subject_ref,
          wardrobe_description: scene.wardrobe_description,
          shot_type: scene.shot_type,
          composition_instruction: scene.composition_instruction,
          visual_atmosphere: scene.visual_atmosphere,
          // Model-specific composition prompts
          composition_instruction_seedream:
            scene.composition_instruction_seedream,
          composition_instruction_nano_banana:
            scene.composition_instruction_nano_banana,
          // Inline characters (Tier 3 extras) for this scene
          inline_characters:
            sceneInlineChars.length > 0 ? sceneInlineChars : undefined,
          // Prop injection method for scene image generation
          prop_injection_method: scene.prop_injection_method,
          // Veo 3.1 video prompt (7-component format)
          video_prompt_veo3: scene.video_prompt_veo3,
        };

        return {
          project_id,
          scene_number: scene.scene_number || 0,
          slugline: scene.slugline || `Scene ${scene.scene_number || 0}`,
          action_text: actionDescription || "No action description",
          characters: Array.isArray(charactersPresent) ? charactersPresent : [],
          raw_scene_data: rawSceneData,
          validation_status: "pending" as const,
        };
      });

      await db.insert(scenes).values(sceneRecords);
      const scenesWithInlineChars = sceneRecords.filter(
        (s) => s.raw_scene_data?.inline_characters?.length
      ).length;
      console.log(
        `Inserted ${sceneRecords.length} raw scenes (${scenesWithInlineChars} with inline characters)`
      );

      // NOTE: Scene-to-shots is NOT triggered here
      // It should be triggered AFTER scene images are approved
      // Each shot will use the approved scene image as start_frame
    }

    // Update project status to bible_review
    await db
      .update(projects)
      .set({
        status: "bible_review",
        updated_at: new Date(),
      })
      .where(eq(projects.id, project_id));

    console.log("Project status updated to bible_review");

    return Response.json({
      success: true,
      message:
        "Bible and raw scenes parsed successfully. Awaiting Bible and scene approval.",
      counts: {
        characters: bible.characters?.length || 0,
        inline_characters: bible.inline_characters?.length || 0,
        locations: bible.locations?.length || 0,
        props: bible.props?.length || 0,
        scenes: raw_scenes.length,
      },
    });
  } catch (error) {
    console.error("Bible parsing webhook error:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
