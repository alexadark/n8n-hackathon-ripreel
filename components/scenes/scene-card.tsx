import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, MapPin, Users, Film, Lightbulb, Music, Package } from "lucide-react";
import type { Scene } from "@/lib/drizzle/schema";

interface SceneCardProps {
  scene: Scene;
}

export function SceneCard({ scene }: SceneCardProps) {
  const fullData = scene.full_data;

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
          <h3 className="font-courier text-white text-lg mb-2 uppercase tracking-wide">
            {fullData.slugline}
          </h3>
        </div>
      </div>

      {/* Location and Time */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 text-[#888]">
          <MapPin size={16} className="text-[#f5c518]" />
          <span className="font-courier">{fullData.location}</span>
        </div>
        <div className="flex items-center gap-2 text-[#888]">
          <Clock size={16} className="text-[#00f2ea]" />
          <span className="font-courier">{fullData.time_of_day}</span>
        </div>
      </div>

      {/* Action Description */}
      <div className="mb-4">
        <p className="font-courier text-[#ccc] text-sm leading-relaxed">
          {fullData.action_description}
        </p>
      </div>

      {/* Dialogue Snippet */}
      {fullData.dialogue_snippet && (
        <div className="mb-4 pl-4 border-l-2 border-[#f5c518]">
          <p className="font-courier text-[#e6e6e6] text-sm italic">
            {fullData.dialogue_snippet}
          </p>
        </div>
      )}

      {/* Characters */}
      {fullData.characters_present && fullData.characters_present.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#f5c518]" />
            <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider">
              Characters
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {fullData.characters_present.map((char, idx: number) => {
              const charData = typeof char === 'string' ? { name: char } : char;
              return (
                <Badge
                  key={idx}
                  variant="outline"
                  className="border-[#333] text-[#ccc] font-courier text-xs"
                >
                  {charData.name}
                  {charData.role === "lead" && (
                    <span className="ml-1 text-[#f5c518]">★</span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Mood */}
      {fullData.visual_mood && (
        <div className="mb-4 bg-[#0a0a0b] border border-[#333] p-4 rounded">
          <div className="flex items-center gap-2 mb-3">
            <Film size={16} className="text-[#00f2ea]" />
            <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider">
              Visual Mood
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Lighting:</span>
              <p className="font-courier text-[#aaa] mt-1">
                {fullData.visual_mood.lighting}
              </p>
            </div>
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Atmosphere:</span>
              <p className="font-courier text-[#aaa] mt-1">
                {fullData.visual_mood.atmosphere}
              </p>
            </div>
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Composition:</span>
              <p className="font-courier text-[#aaa] mt-1">
                {fullData.visual_mood.composition}
              </p>
            </div>
            <div>
              <span className="font-oswald uppercase text-[#666] text-xs">Color Palette:</span>
              <p className="font-courier text-[#aaa] mt-1">
                {fullData.visual_mood.color_palette}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Props & Materials */}
      {fullData.props_and_materials && fullData.props_and_materials.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-[#f5c518]" />
            <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider">
              Props & Materials
            </h4>
          </div>
          <div className="space-y-2">
            {fullData.props_and_materials
              .map((prop) => typeof prop === 'string' ? { item: prop } : prop)
              .filter((propData) => propData.importance === "high")
              .slice(0, 3)
              .map((propData, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-courier text-[#f5c518] text-xs">•</span>
                  <div className="flex-1">
                    <span className="font-courier text-[#ccc] text-xs">{propData.item}</span>
                    {propData.visual_note && (
                      <p className="font-courier text-[#666] text-xs mt-1">
                        {propData.visual_note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Audio Requirements */}
      {fullData.audio_requirements && (
        <div className="mb-4 bg-[#0a0a0b] border border-[#333] p-4 rounded">
          <div className="flex items-center gap-2 mb-3">
            <Music size={16} className="text-[#e02f2f]" />
            <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider">
              Audio Mood
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {fullData.audio_requirements.music_mood && (
              <div>
                <span className="font-oswald uppercase text-[#666] text-xs">Music:</span>
                <p className="font-courier text-[#aaa] mt-1">
                  {fullData.audio_requirements.music_mood}
                </p>
              </div>
            )}
            {fullData.audio_requirements.ambient && (
                <div>
                  <span className="font-oswald uppercase text-[#666] text-xs">
                    Ambient:
                  </span>
                  <p className="font-courier text-[#aaa] mt-1">
                    {Array.isArray(fullData.audio_requirements.ambient)
                      ? fullData.audio_requirements.ambient.slice(0, 2).join(", ")
                      : fullData.audio_requirements.ambient}
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Image Generation Prompt */}
      {fullData.image_generation_prompt && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-[#00f2ea]" />
            <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider">
              AI Generation Prompt
            </h4>
          </div>
          <p className="font-courier text-[#666] text-xs leading-relaxed">
            {fullData.image_generation_prompt}
          </p>
        </div>
      )}

      {/* Production Notes */}
      {fullData.production_notes && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <h4 className="font-oswald uppercase text-xs text-[#888] tracking-wider mb-2">
            Production Notes
          </h4>
          <p className="font-courier text-[#666] text-xs leading-relaxed">
            {fullData.production_notes}
          </p>
        </div>
      )}
    </Card>
  );
}
