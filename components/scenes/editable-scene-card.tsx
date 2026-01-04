'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Clock,
  MapPin,
  Users,
  Film,
  Lightbulb,
  Music,
  Package,
  Edit,
  Check,
  X,
  Camera,
} from 'lucide-react';
import type { Scene, ProjectCharacter, ProjectLocation, ProjectProp } from '@/lib/drizzle/schema';
import { projectsAction } from '@/hooks/use-server-action';
import { ApproveSceneButton } from './approve-scene-button';
import { optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

interface EditableSceneCardProps {
  scene: Scene;
  characters?: ProjectCharacter[];
  locations?: ProjectLocation[];
  props?: ProjectProp[];
}

export function EditableSceneCard({ scene, characters = [], locations = [], props = [] }: EditableSceneCardProps) {
  const revalidator = useRevalidator();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Find matching Bible assets for this scene
  // Check raw_scene_data first (from N8N), then full_data for backward compatibility
  const rawData = scene.raw_scene_data;

  // Helper to ensure we always have an array
  const ensureArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  // Normalize string for fuzzy matching - removes special chars, extra spaces, lowercases
  const normalizeForMatch = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
  };

  // Fuzzy match function - checks if strings match after normalization
  // Also checks if one contains the other (for partial matches)
  const fuzzyMatch = (a: string, b: string): boolean => {
    const normA = normalizeForMatch(a);
    const normB = normalizeForMatch(b);
    if (!normA || !normB) return false;
    // Exact match after normalization
    if (normA === normB) return true;
    // One contains the other (for "Backstage Flamenco Club" vs "Flamenco Club")
    if (normA.includes(normB) || normB.includes(normA)) return true;
    return false;
  };

  // Location matching - fuzzy comparison to handle n8n name variations
  const locationName = (rawData?.location || rawData?.bible_location_id ||
    (scene.full_data?.location_ref as string) || (scene.full_data?.location as string) || '') as string;
  const sceneLocation = locations.find(
    (loc) => fuzzyMatch(loc.name, locationName)
  );

  // Character matching - fuzzy comparison to handle n8n name variations
  const rawCharacterNames = ensureArray(rawData?.characters_present);
  const characterNames = rawCharacterNames.length > 0
    ? rawCharacterNames
    : ensureArray(rawData?.bible_character_ids);
  const sceneCharacters = characters.filter((char) =>
    characterNames.some(
      (charName) => fuzzyMatch(charName || '', char.name)
    ) || ensureArray(scene.full_data?.characters_present).some(
      (sceneChar) => {
        // Handle both string format and object format { name: string }
        const name = typeof sceneChar === 'string' ? sceneChar : (sceneChar as { name?: string })?.name;
        return fuzzyMatch(name || '', char.name);
      }
    ) || ensureArray(scene.characters).some(
      (charName) => fuzzyMatch(charName || '', char.name)
    )
  );

  // Props matching - fuzzy comparison to handle n8n name variations
  const rawPropNames = ensureArray(rawData?.props_used);
  const propNames = rawPropNames.length > 0 ? rawPropNames : ensureArray(rawData?.bible_prop_ids);
  const sceneProps = props.filter((prop) =>
    propNames.some(
      (propName) => fuzzyMatch(propName || '', prop.name)
    )
  );

  // Helper function to normalize audio arrays (n8n may return strings or arrays)
  const normalizeAudioArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Split by comma if it's a comma-separated string
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  // Helper to get data with rawData fallback
  const getData = <T,>(fullDataValue: T | undefined, rawDataValue: T | undefined, fallback: T): T => {
    return fullDataValue ?? rawDataValue ?? fallback;
  };

  const [editedData, setEditedData] = useState({
    slugline: getData(scene.full_data?.slugline, rawData?.slugline, scene.slugline || ""),
    action_description: getData(scene.full_data?.action_description, rawData?.action_description, scene.action_text || ""),
    location: getData(scene.full_data?.location, rawData?.location || rawData?.bible_location_id, ""),
    time_of_day: getData(scene.full_data?.time_of_day, rawData?.time_of_day, ""),
    duration_estimate: getData(scene.full_data?.duration_estimate, rawData?.estimated_duration_seconds, 0),
    dialogue_snippet: getData(scene.full_data?.dialogue_snippet, rawData?.dialogue_snippet, ""),
    image_generation_prompt: scene.full_data?.image_generation_prompt || "",
    production_notes: getData(scene.full_data?.production_notes, rawData?.production_notes, ""),
    visual_mood_lighting: scene.full_data?.visual_mood?.lighting || rawData?.visual_mood?.lighting || "",
    visual_mood_atmosphere: scene.full_data?.visual_mood?.atmosphere || rawData?.visual_mood?.atmosphere || rawData?.visual_atmosphere || "",
    visual_mood_composition: scene.full_data?.visual_mood?.composition || rawData?.visual_mood?.composition || rawData?.composition_instruction || "",
    visual_mood_color_palette: scene.full_data?.visual_mood?.color_palette || rawData?.visual_mood?.color_palette || "",
    audio_music_mood: scene.full_data?.audio_requirements?.music_mood || rawData?.audio_requirements?.music_mood || rawData?.audio_requirements?.music || "",
    audio_dialogue_tone: scene.full_data?.audio_requirements?.dialogue_tone || rawData?.audio_requirements?.dialogue_tone || "",
    characters_json: JSON.stringify(scene.full_data?.characters_present || rawData?.characters_present || rawData?.bible_character_ids || [], null, 2),
    props_json: JSON.stringify(scene.full_data?.props_and_materials || rawData?.props_used || rawData?.bible_prop_ids || [], null, 2),
    audio_ambient_json: JSON.stringify(scene.full_data?.audio_requirements?.ambient || rawData?.audio_requirements?.ambient || [], null, 2),
    audio_sfx_json: JSON.stringify(scene.full_data?.audio_requirements?.sfx || rawData?.audio_requirements?.sfx || [], null, 2),
  });

  // Use full_data if available, otherwise fall back to raw_scene_data
  // full_data = composed data after Bible approval (Stage 2)
  // raw_scene_data = raw data from n8n orchestrator (Stage 1)
  const fullData = scene.full_data || rawData;

  // Extract shots data from fullData or rawData (new n8n structure)
  interface VideoPromptVeo3 {
    action?: string;
    dialogue?: string;
    scene?: string;
    subject?: string;
    sounds?: string;
    style?: string;
    technical?: string;
  }
  interface ShotData {
    shot_number?: number;
    shot_type?: string;
    dialogue_segment?: string;
    video_prompt_veo3?: VideoPromptVeo3;
    composition_instruction_seedream?: string;
    composition_instruction_nano_banana?: string;
    end_frame_instruction?: string;
    shot_duration_seconds?: number;
    is_first_shot?: boolean;
  }
  const shots = (fullData?.shots as ShotData[] | undefined) || (rawData?.shots as ShotData[] | undefined) || [];

  // Combine all dialogue from shots
  const allDialogue = shots
    .filter(shot => shot.dialogue_segment || shot.video_prompt_veo3?.dialogue)
    .map(shot => shot.dialogue_segment || shot.video_prompt_veo3?.dialogue)
    .filter(Boolean)
    .join('\n\n');

  // Combine all action descriptions from shots
  const allActions = shots
    .filter(shot => shot.video_prompt_veo3?.action)
    .map((shot, idx) => `Shot ${shot.shot_number || idx + 1}: ${shot.video_prompt_veo3?.action}`)
    .join('\n\n');

  const handleSave = async () => {
    console.log("💾 Saving scene edits:", { sceneId: scene.id, edits: editedData });
    setIsSaving(true);

    try {
      // Parse JSON fields
      const characters_present = JSON.parse(editedData.characters_json);
      const props_and_materials = JSON.parse(editedData.props_json);
      const ambient = JSON.parse(editedData.audio_ambient_json);
      const sfx = JSON.parse(editedData.audio_sfx_json);

      const result = await projectsAction('updateScene', scene.id, {
        slugline: editedData.slugline,
        action_description: editedData.action_description,
        location: editedData.location,
        time_of_day: editedData.time_of_day,
        duration_estimate: editedData.duration_estimate,
        dialogue_snippet: editedData.dialogue_snippet,
        image_generation_prompt: editedData.image_generation_prompt,
        production_notes: editedData.production_notes,
        characters_present,
        props_and_materials,
        visual_mood: {
          lighting: editedData.visual_mood_lighting,
          atmosphere: editedData.visual_mood_atmosphere,
          composition: editedData.visual_mood_composition,
          color_palette: editedData.visual_mood_color_palette,
        },
        audio_requirements: {
          music_mood: editedData.audio_music_mood,
          dialogue_tone: editedData.audio_dialogue_tone,
          ambient,
          sfx,
        },
      });

      if (result.success) {
        console.log("✅ Scene saved successfully");
        setIsEditing(false);
        revalidator.revalidate(); // Refresh data
      } else {
        console.error("❌ Failed to save scene:", result.error);
        alert(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error parsing JSON:", error);
      alert("Invalid JSON in one of the fields. Please check your edits.");
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditedData({
      slugline: getData(scene.full_data?.slugline, rawData?.slugline, scene.slugline || ""),
      action_description: getData(scene.full_data?.action_description, rawData?.action_description, scene.action_text || ""),
      location: getData(scene.full_data?.location, rawData?.location || rawData?.bible_location_id, ""),
      time_of_day: getData(scene.full_data?.time_of_day, rawData?.time_of_day, ""),
      duration_estimate: getData(scene.full_data?.duration_estimate, rawData?.estimated_duration_seconds, 0),
      dialogue_snippet: getData(scene.full_data?.dialogue_snippet, rawData?.dialogue_snippet, ""),
      image_generation_prompt: scene.full_data?.image_generation_prompt || "",
      production_notes: getData(scene.full_data?.production_notes, rawData?.production_notes, ""),
      visual_mood_lighting: scene.full_data?.visual_mood?.lighting || rawData?.visual_mood?.lighting || "",
      visual_mood_atmosphere: scene.full_data?.visual_mood?.atmosphere || rawData?.visual_mood?.atmosphere || rawData?.visual_atmosphere || "",
      visual_mood_composition: scene.full_data?.visual_mood?.composition || rawData?.visual_mood?.composition || rawData?.composition_instruction || "",
      visual_mood_color_palette: scene.full_data?.visual_mood?.color_palette || rawData?.visual_mood?.color_palette || "",
      audio_music_mood: scene.full_data?.audio_requirements?.music_mood || rawData?.audio_requirements?.music_mood || rawData?.audio_requirements?.music || "",
      audio_dialogue_tone: scene.full_data?.audio_requirements?.dialogue_tone || rawData?.audio_requirements?.dialogue_tone || "",
      characters_json: JSON.stringify(scene.full_data?.characters_present || rawData?.characters_present || rawData?.bible_character_ids || [], null, 2),
      props_json: JSON.stringify(scene.full_data?.props_and_materials || rawData?.props_used || rawData?.bible_prop_ids || [], null, 2),
      audio_ambient_json: JSON.stringify(scene.full_data?.audio_requirements?.ambient || rawData?.audio_requirements?.ambient || [], null, 2),
      audio_sfx_json: JSON.stringify(scene.full_data?.audio_requirements?.sfx || rawData?.audio_requirements?.sfx || [], null, 2),
    });
    setIsEditing(false);
  };

  if (!fullData) {
    return (
      <Card className="bg-[#1c1c1f] border-[#333] p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs">
                Scene {scene.scene_number}
              </Badge>
            </div>
            <h3 className="font-courier text-white text-lg mb-2 uppercase">
              {scene.slugline}
            </h3>
            <p className="font-courier text-[#888] text-sm">
              {scene.action_text}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1c1c1f] border-[#333] hover:border-[#f5c518] transition-colors p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs">
              Scene {fullData.scene_number}
            </Badge>
            <Badge variant="outline" className="border-[#333] text-[#888] font-courier text-xs">
              {fullData.interior_exterior}
            </Badge>
            <div className="flex items-center gap-1 text-[#666]">
              <Clock size={14} />
              <span className="font-courier text-xs">{fullData.duration_estimate}s</span>
            </div>
          </div>

          {/* Slugline - Editable */}
          {isEditing ? (
            <input
              type="text"
              value={editedData.slugline}
              onChange={(e) => setEditedData({ ...editedData, slugline: e.target.value })}
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-white font-courier text-lg uppercase p-2 mb-2"
            />
          ) : (
            <h3 className="font-courier font-bold text-white text-lg mb-2 uppercase">
              {fullData.slugline}
            </h3>
          )}

          {isEditing ? (
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <MapPin size={14} className="text-[#666]" />
                <input
                  type="text"
                  value={editedData.location}
                  onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                  placeholder="Location"
                  className="flex-1 bg-[#0a0a0b] border border-[#f5c518] text-white font-courier text-sm p-1 px-2"
                />
              </div>
              <input
                type="text"
                value={editedData.time_of_day}
                onChange={(e) => setEditedData({ ...editedData, time_of_day: e.target.value })}
                placeholder="Time of day"
                className="w-32 bg-[#0a0a0b] border border-[#f5c518] text-white font-courier text-sm p-1 px-2"
              />
              <input
                type="number"
                value={editedData.duration_estimate}
                onChange={(e) => setEditedData({ ...editedData, duration_estimate: parseInt(e.target.value) || 0 })}
                placeholder="Duration"
                className="w-20 bg-[#0a0a0b] border border-[#f5c518] text-white font-courier text-sm p-1 px-2"
              />
              <span className="text-[#666] text-xs">sec</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-[#666] text-sm font-courier mb-3">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>{fullData.location}</span>
              </div>
              <span>•</span>
              <span>{fullData.time_of_day}</span>
            </div>
          )}
        </div>

        {/* Edit Controls */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#00f2ea] hover:bg-[#00d9d1] text-black p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isSaving ? "Saving..." : "Save changes"}
              >
                <Check size={18} />
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="bg-[#333] hover:bg-[#555] text-white p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-[#333] hover:bg-[#f5c518] hover:text-black text-white p-2 transition-colors"
              title="Edit scene"
            >
              <Edit size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Bible Context - Character, Location & Prop References */}
      {(sceneLocation || sceneCharacters.length > 0 || sceneProps.length > 0) && (
        <div className="mb-4 p-4 bg-[#0a0a0b] border border-[#333] rounded">
          <h4 className="font-oswald uppercase text-[#f5c518] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Camera size={14} />
            Scene Context (From Bible)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Context */}
            {sceneLocation && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-[#00f2ea]" />
                  <span className="font-oswald uppercase text-[#00f2ea] text-xs">Location</span>
                </div>
                {sceneLocation.approved_image_url ? (
                  <div className="relative w-full aspect-video rounded overflow-hidden mb-2">
                    <img
                      src={optimizeImageUrl(sceneLocation.approved_image_url, IMAGE_SIZES.cardMedium)}
                      alt={sceneLocation.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-[#141416] rounded flex items-center justify-center mb-2">
                    <MapPin size={24} className="text-[#333]" />
                  </div>
                )}
                <p className="font-oswald text-white text-sm uppercase">{sceneLocation.name}</p>
                <p className="font-courier text-[#666] text-xs mt-1 line-clamp-2">
                  {sceneLocation.visual_description}
                </p>
              </div>
            )}

            {/* Characters Context */}
            {sceneCharacters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={12} className="text-[#f5c518]" />
                  <span className="font-oswald uppercase text-[#f5c518] text-xs">
                    Characters ({sceneCharacters.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sceneCharacters.map((char) => (
                    <div key={char.id} className="flex items-center gap-2 bg-[#1c1c1f] border border-[#333] rounded p-2">
                      {char.approved_image_url ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <img
                            src={optimizeImageUrl(char.approved_image_url, IMAGE_SIZES.thumbnailSmall)}
                            alt={char.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#141416] flex items-center justify-center">
                          <Users size={16} className="text-[#333]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-oswald text-white text-xs uppercase truncate">
                          {char.name}
                        </p>
                        <p className="font-courier text-[#666] text-xs">
                          {char.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Props Context */}
            {sceneProps.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={12} className="text-[#00f2ea]" />
                  <span className="font-oswald uppercase text-[#00f2ea] text-xs">
                    Props ({sceneProps.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sceneProps.map((prop) => (
                    <div key={prop.id} className="flex items-center gap-2 bg-[#1c1c1f] border border-[#333] rounded p-2">
                      {prop.approved_image_url ? (
                        <div className="relative w-10 h-10 rounded overflow-hidden">
                          <img
                            src={optimizeImageUrl(prop.approved_image_url, IMAGE_SIZES.thumbnailSmall)}
                            alt={prop.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#141416] flex items-center justify-center">
                          <Package size={16} className="text-[#333]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-oswald text-white text-xs uppercase truncate">
                          {prop.name}
                        </p>
                        <Badge
                          className={
                            prop.importance === "high"
                              ? "bg-[#e02f2f] text-white text-xs"
                              : prop.importance === "medium"
                                ? "bg-[#f5c518] text-black text-xs"
                                : "bg-[#333] text-white text-xs"
                          }
                        >
                          {prop.importance}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shot Type & Composition (from N8N workflow) */}
      {(rawData?.shot_type || rawData?.composition_instruction || fullData?.shot_type || fullData?.composition_instruction) && (
        <div className="mb-4 p-4 bg-[#0a0a0b] border border-[#333] rounded">
          <h4 className="font-oswald uppercase text-[#00f2ea] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Camera size={14} />
            Camera Direction
          </h4>
          {(rawData?.shot_type || fullData?.shot_type) && (
            <div className="mb-2">
              <span className="font-oswald uppercase text-[#666] text-xs">Shot Type:</span>
              <p className="font-courier text-[#ccc] text-sm mt-1">{rawData?.shot_type || fullData?.shot_type}</p>
            </div>
          )}
          {(rawData?.composition_instruction || fullData?.composition_instruction) && (
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Composition:</span>
              <p className="font-courier text-[#ccc] text-sm mt-1">{rawData?.composition_instruction || fullData?.composition_instruction}</p>
            </div>
          )}
        </div>
      )}

      {/* Image Generation Context (new N8N fields) */}
      {(rawData?.main_subject_ref || rawData?.wardrobe_description || rawData?.visual_atmosphere) && (
        <div className="mb-4 p-4 bg-[#0a0a0b] border border-[#333] rounded">
          <h4 className="font-oswald uppercase text-[#f5c518] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Lightbulb size={14} />
            Image Generation Context
          </h4>
          {rawData?.main_subject_ref && (
            <div className="mb-2">
              <span className="font-oswald uppercase text-[#666] text-xs">Main Subject:</span>
              <p className="font-courier text-[#ccc] text-sm mt-1">{rawData.main_subject_ref}</p>
            </div>
          )}
          {rawData?.wardrobe_description && (
            <div className="mb-2">
              <span className="font-oswald uppercase text-[#666] text-xs">Wardrobe:</span>
              <p className="font-courier text-[#ccc] text-sm mt-1">{rawData.wardrobe_description}</p>
            </div>
          )}
          {rawData?.visual_atmosphere && (
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Visual Atmosphere:</span>
              <p className="font-courier text-[#ccc] text-sm mt-1">{rawData.visual_atmosphere}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Description - from shots or legacy field */}
      {(allActions || fullData.action_description || isEditing) && (
        <div className="mb-4">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2">
            Action
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.action_description}
              onChange={(e) => setEditedData({ ...editedData, action_description: e.target.value })}
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#ccc] font-courier text-sm p-3 min-h-[100px]"
              rows={4}
            />
          ) : (
            <div className="font-courier text-[#ccc] text-sm leading-relaxed whitespace-pre-line">
              {allActions || fullData.action_description || 'No action description'}
            </div>
          )}
        </div>
      )}

      {/* Dialogue - from shots or legacy field */}
      {(allDialogue || fullData.dialogue_snippet || isEditing) && (
        <div className="mb-4 pl-4 border-l-2 border-[#f5c518]">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2">
            Dialogue
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.dialogue_snippet}
              onChange={(e) => setEditedData({ ...editedData, dialogue_snippet: e.target.value })}
              placeholder="Key dialogue from this scene (optional)"
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#e6e6e6] font-courier text-sm italic p-2 min-h-[60px]"
              rows={2}
            />
          ) : (
            <div className="font-courier text-[#e6e6e6] text-sm italic whitespace-pre-line">
              {allDialogue || fullData.dialogue_snippet || 'No dialogue'}
            </div>
          )}
        </div>
      )}

      {/* Shot Details - Video Generation Data */}
      {shots.length > 0 && !isEditing && (
        <div className="mb-4 bg-[#0a0a0b] border border-[#333] p-4 rounded">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Film size={14} className="text-[#00f2ea]" />
            Shot Breakdown ({shots.length} {shots.length === 1 ? 'shot' : 'shots'})
          </h4>
          <div className="space-y-4">
            {shots.map((shot, idx) => (
              <div key={idx} className="border-l-2 border-[#00f2ea] pl-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-[#00f2ea] text-black font-oswald uppercase text-xs">
                    Shot {shot.shot_number || idx + 1}
                  </Badge>
                  {shot.shot_type && (
                    <Badge variant="outline" className="border-[#333] text-[#888] font-courier text-xs">
                      {shot.shot_type}
                    </Badge>
                  )}
                  {shot.shot_duration_seconds && (
                    <span className="text-[#666] font-courier text-xs flex items-center gap-1">
                      <Clock size={12} />
                      {shot.shot_duration_seconds}s
                    </span>
                  )}
                </div>

                {/* Subject Description */}
                {shot.video_prompt_veo3?.subject && (
                  <div>
                    <span className="font-oswald uppercase text-[#f5c518] text-xs">Subject:</span>
                    <p className="font-courier text-[#ccc] text-xs mt-1 leading-relaxed">
                      {shot.video_prompt_veo3.subject}
                    </p>
                  </div>
                )}

                {/* Scene Description */}
                {shot.video_prompt_veo3?.scene && (
                  <div>
                    <span className="font-oswald uppercase text-[#00f2ea] text-xs">Scene:</span>
                    <p className="font-courier text-[#ccc] text-xs mt-1 leading-relaxed">
                      {shot.video_prompt_veo3.scene}
                    </p>
                  </div>
                )}

                {/* Dialogue Segment */}
                {(shot.dialogue_segment || shot.video_prompt_veo3?.dialogue) && (
                  <div className="pl-3 border-l border-[#f5c518]">
                    <span className="font-oswald uppercase text-[#f5c518] text-xs">Dialogue:</span>
                    <p className="font-courier text-[#e6e6e6] text-xs mt-1 italic">
                      {shot.dialogue_segment || shot.video_prompt_veo3?.dialogue}
                    </p>
                  </div>
                )}

                {/* Sounds */}
                {shot.video_prompt_veo3?.sounds && (
                  <div>
                    <span className="font-oswald uppercase text-[#e02f2f] text-xs">Sounds:</span>
                    <p className="font-courier text-[#aaa] text-xs mt-1">
                      {shot.video_prompt_veo3.sounds}
                    </p>
                  </div>
                )}

                {/* Camera Style */}
                {shot.video_prompt_veo3?.style && (
                  <div>
                    <span className="font-oswald uppercase text-[#666] text-xs">Camera/Style:</span>
                    <p className="font-courier text-[#888] text-xs mt-1">
                      {shot.video_prompt_veo3.style}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Characters */}
      {(fullData.characters_present && fullData.characters_present.length > 0) || isEditing ? (
        <div className="mb-4">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2 flex items-center gap-2">
            <Users size={14} />
            Characters {isEditing && <span className="text-[#666] font-courier normal-case">(JSON format)</span>}
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.characters_json}
              onChange={(e) => setEditedData({ ...editedData, characters_json: e.target.value })}
              placeholder='[{"name": "Character Name", "role": "lead/supporting/background", "emotional_state": "...", "actions": ["action1", "action2"]}]'
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#ccc] font-mono text-xs p-3 min-h-[150px]"
              rows={6}
            />
          ) : (
            <div className="space-y-3">
              {fullData.characters_present?.map((char, idx) => {
                const charData = typeof char === 'string' ? { name: char } : char;
                return (
                <div key={idx} className="bg-[#0a0a0b] border border-[#333] p-3 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs">
                      {charData.name}
                    </Badge>
                    <Badge variant="outline" className="border-[#333] text-[#888] font-courier text-xs">
                      {charData.role}
                    </Badge>
                  </div>
                  {charData.emotional_state && (
                    <div className="mb-2">
                      <span className="font-oswald uppercase text-[#666] text-xs">Emotional State:</span>
                      <p className="font-courier text-[#aaa] text-xs mt-1">{charData.emotional_state}</p>
                    </div>
                  )}
                  {charData.actions && charData.actions.length > 0 && (
                    <div>
                      <span className="font-oswald uppercase text-[#666] text-xs">Actions:</span>
                      <ul className="list-disc list-inside font-courier text-[#aaa] text-xs mt-1 space-y-1">
                        {charData.actions.map((action, actionIdx) => (
                          <li key={actionIdx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}
        </div>
      ) : null}

      {/* Visual Mood */}
      {(fullData.visual_mood || isEditing) && (
        <div className="mb-4 bg-[#0a0a0b] border border-[#333] p-4 rounded">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Film size={14} className="text-[#00f2ea]" />
            Visual Mood
          </h4>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Lighting:</label>
                <input
                  type="text"
                  value={editedData.visual_mood_lighting}
                  onChange={(e) => setEditedData({ ...editedData, visual_mood_lighting: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                />
              </div>
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Atmosphere:</label>
                <input
                  type="text"
                  value={editedData.visual_mood_atmosphere}
                  onChange={(e) => setEditedData({ ...editedData, visual_mood_atmosphere: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                />
              </div>
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Composition:</label>
                <input
                  type="text"
                  value={editedData.visual_mood_composition}
                  onChange={(e) => setEditedData({ ...editedData, visual_mood_composition: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                />
              </div>
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Color Palette:</label>
                <input
                  type="text"
                  value={editedData.visual_mood_color_palette}
                  onChange={(e) => setEditedData({ ...editedData, visual_mood_color_palette: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-oswald uppercase text-[#666] text-xs">Lighting:</span>
                <p className="font-courier text-[#aaa] mt-1">{fullData.visual_mood?.lighting}</p>
              </div>
              <div>
                <span className="font-oswald uppercase text-[#666] text-xs">Atmosphere:</span>
                <p className="font-courier text-[#aaa] mt-1">{fullData.visual_mood?.atmosphere}</p>
              </div>
              <div>
                <span className="font-oswald uppercase text-[#666] text-xs">Composition:</span>
                <p className="font-courier text-[#aaa] mt-1">{fullData.visual_mood?.composition}</p>
              </div>
              <div>
                <span className="font-oswald uppercase text-[#666] text-xs">Color Palette:</span>
                <p className="font-courier text-[#aaa] mt-1">{fullData.visual_mood?.color_palette}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Props & Materials */}
      {(fullData.props_and_materials && fullData.props_and_materials.length > 0) || isEditing ? (
        <div className="mb-4">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2 flex items-center gap-2">
            <Package size={14} className="text-[#f5c518]" />
            Props & Materials {isEditing && <span className="text-[#666] font-courier normal-case">(JSON format)</span>}
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.props_json}
              onChange={(e) => setEditedData({ ...editedData, props_json: e.target.value })}
              placeholder='[{"item": "prop name", "importance": "high/medium/low", "visual_note": "description"}]'
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#ccc] font-mono text-xs p-3 min-h-[150px]"
              rows={6}
            />
          ) : (
            <div className="space-y-2">
              {fullData.props_and_materials?.map((prop, idx: number) => {
                const propData = typeof prop === 'string' ? { item: prop } : prop;
                return (
                  <div key={idx} className="flex items-start gap-2 bg-[#0a0a0b] border border-[#333] p-3 rounded">
                    <Badge
                      className={
                        propData.importance === "high"
                          ? "bg-[#e02f2f] text-white"
                          : propData.importance === "medium"
                          ? "bg-[#f5c518] text-black"
                          : "bg-[#333] text-white"
                      }
                    >
                      {propData.importance || "—"}
                    </Badge>
                    <div className="flex-1">
                      <span className="font-courier text-[#ccc] text-xs font-bold">{propData.item}</span>
                      {propData.visual_note && (
                        <p className="font-courier text-[#666] text-xs mt-1">{propData.visual_note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Audio Requirements */}
      {(fullData.audio_requirements || isEditing) && (
        <div className="mb-4 bg-[#0a0a0b] border border-[#333] p-4 rounded">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-3 flex items-center gap-2">
            <Music size={14} className="text-[#e02f2f]" />
            Audio Requirements
          </h4>
          <div className="space-y-3 text-xs">
            {(fullData.audio_requirements?.music_mood || isEditing) && (
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Music Mood:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.audio_music_mood}
                    onChange={(e) => setEditedData({ ...editedData, audio_music_mood: e.target.value })}
                    className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                  />
                ) : (
                  <p className="font-courier text-[#aaa] mt-1">{fullData.audio_requirements?.music_mood}</p>
                )}
              </div>
            )}
            {(fullData.audio_requirements?.dialogue_tone || isEditing) && (
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Dialogue Tone:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.audio_dialogue_tone}
                    onChange={(e) => setEditedData({ ...editedData, audio_dialogue_tone: e.target.value })}
                    className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-courier text-xs p-2"
                  />
                ) : (
                  <p className="font-courier text-[#aaa] mt-1">{fullData.audio_requirements?.dialogue_tone}</p>
                )}
              </div>
            )}
            {((fullData.audio_requirements?.ambient && (Array.isArray(fullData.audio_requirements.ambient) ? fullData.audio_requirements.ambient.length > 0 : fullData.audio_requirements.ambient)) || isEditing) && (
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">Ambient:</label>
                {isEditing ? (
                  <textarea
                    value={editedData.audio_ambient_json}
                    onChange={(e) => setEditedData({ ...editedData, audio_ambient_json: e.target.value })}
                    placeholder='["ambient sound 1", "ambient sound 2"]'
                    className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-mono text-xs p-2 min-h-[60px]"
                    rows={2}
                  />
                ) : (
                  <ul className="list-disc list-inside font-courier text-[#aaa] mt-1 space-y-1">
                    {normalizeAudioArray(fullData.audio_requirements?.ambient).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {((fullData.audio_requirements?.sfx && (Array.isArray(fullData.audio_requirements.sfx) ? fullData.audio_requirements.sfx.length > 0 : fullData.audio_requirements.sfx)) || isEditing) && (
              <div>
                <label className="font-oswald uppercase text-[#666] text-xs block mb-1">SFX:</label>
                {isEditing ? (
                  <textarea
                    value={editedData.audio_sfx_json}
                    onChange={(e) => setEditedData({ ...editedData, audio_sfx_json: e.target.value })}
                    placeholder='["sound effect 1", "sound effect 2"]'
                    className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#aaa] font-mono text-xs p-2 min-h-[60px]"
                    rows={2}
                  />
                ) : (
                  <ul className="list-disc list-inside font-courier text-[#aaa] mt-1 space-y-1">
                    {normalizeAudioArray(fullData.audio_requirements?.sfx).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Generation Prompt */}
      {(fullData.image_generation_prompt || isEditing) && (
        <div className="mb-4">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="text-[#00f2ea]" />
            AI Generation Prompt
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.image_generation_prompt}
              onChange={(e) => setEditedData({ ...editedData, image_generation_prompt: e.target.value })}
              placeholder="Detailed prompt for AI image generation"
              className="w-full bg-[#0a0a0b] border border-[#00f2ea] text-[#00f2ea] font-courier text-xs leading-relaxed p-3 min-h-[120px]"
              rows={5}
            />
          ) : (
            <p className="font-courier text-[#00f2ea] text-xs leading-relaxed bg-[#0a0a0b] p-3 border-l-2 border-[#00f2ea]">
              {fullData.image_generation_prompt}
            </p>
          )}
        </div>
      )}

      {/* Production Notes */}
      {(fullData.production_notes || isEditing) && (
        <div className="mb-4">
          <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider mb-2">
            Production Notes
          </h4>
          {isEditing ? (
            <textarea
              value={editedData.production_notes}
              onChange={(e) => setEditedData({ ...editedData, production_notes: e.target.value })}
              placeholder="Production notes, technical requirements, special considerations"
              className="w-full bg-[#0a0a0b] border border-[#f5c518] text-[#ccc] font-courier text-xs leading-relaxed p-3 min-h-[100px]"
              rows={4}
            />
          ) : (
            <p className="font-courier text-[#666] text-xs leading-relaxed bg-[#0a0a0b] border border-[#333] p-3 rounded">
              {fullData.production_notes}
            </p>
          )}
        </div>
      )}

      {/* Validation Status and Approval */}
      {!isEditing && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <ApproveSceneButton
            sceneId={scene.id}
            isApproved={scene.validation_status === 'approved'}
          />
        </div>
      )}
    </Card>
  );
}
