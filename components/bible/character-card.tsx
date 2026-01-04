'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import {
  User,
  Check,
  Loader2,
  Edit,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { bibleAction } from '@/hooks/use-server-action';
import { ShotCard } from '@/components/bible/shot-card';
import type { ProjectCharacter, BibleImageVariant } from '@/lib/drizzle/schema';
import { cn } from '@/lib/utils';

interface CharacterCardProps {
  character: ProjectCharacter;
  variantsByShot?: Map<string, BibleImageVariant[]>;
}

export function CharacterCard({ character, variantsByShot }: CharacterCardProps) {
  const revalidator = useRevalidator();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editedData, setEditedData] = useState({
    name: character.name,
    role: character.role,
    visual_dna: character.visual_dna,
    backstory: character.backstory || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await bibleAction('updateCharacter', character.id, editedData);
      if (result.success) {
        toast.success('Character updated');
        setIsEditing(false);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      name: character.name,
      role: character.role,
      visual_dna: character.visual_dna,
      backstory: character.backstory || '',
    });
    setIsEditing(false);
  };

  const roleColor = {
    lead: 'bg-[#f5c518] text-black',
    supporting: 'bg-[#666] text-white',
    background: 'bg-[#333] text-[#888]',
  };

  const rawData = character.raw_data as {
    emotional_archetype?: string;
    first_appearance?: number;
    dialogue_style?: string;
    relationships?: Record<string, string>;
    costume_notes?: string;
  } | null;

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg overflow-hidden">
      {/* Header Section */}
      <div className="p-6 border-b border-[#333]">
        {/* Title Row with Edit/Save */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#141416] rounded-full flex items-center justify-center border border-[#333]">
              <User size={24} className="text-[#666]" />
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={editedData.name}
                  onChange={(e) =>
                    setEditedData({ ...editedData, name: e.target.value })
                  }
                  className="bg-[#0a0a0b] border-[#333] text-white font-oswald text-xl uppercase tracking-wider"
                />
              ) : (
                <h3 className="font-oswald text-2xl uppercase tracking-wider text-white">
                  {character.name}
                </h3>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={cn(
                    'font-oswald uppercase text-xs',
                    roleColor[character.role]
                  )}
                >
                  {character.role}
                </Badge>
                {character.portrait_status === 'approved' ? (
                  <Badge className="bg-green-500/20 text-green-400 font-oswald uppercase text-xs">
                    <Check size={12} className="mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge className="bg-[#f5c518]/20 text-[#f5c518] font-oswald uppercase text-xs">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                  className="border-[#333] text-[#888]"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518] hover:text-black"
                disabled={character.portrait_status === 'approved'}
              >
                <Edit size={14} className="mr-1" />
                Edit Details
              </Button>
            )}
          </div>
        </div>

        {/* Role Selector (only in edit mode) */}
        {isEditing && (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-2 block">Role</Label>
            <Select
              value={editedData.role}
              onValueChange={(value: 'lead' | 'supporting' | 'background') =>
                setEditedData({ ...editedData, role: value })
              }
            >
              <SelectTrigger className="bg-[#0a0a0b] border-[#333] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="supporting">Supporting</SelectItem>
                <SelectItem value="background">Background</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Visual DNA */}
        <div className="mb-4">
          <Label className="text-[#888] text-xs mb-2 block font-oswald uppercase">
            Visual DNA
          </Label>
          {isEditing ? (
            <Textarea
              value={editedData.visual_dna}
              onChange={(e) =>
                setEditedData({ ...editedData, visual_dna: e.target.value })
              }
              className="bg-[#0a0a0b] border-[#333] text-white font-courier text-sm min-h-[100px]"
              rows={5}
            />
          ) : (
            <p className="font-courier text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
              {character.visual_dna}
            </p>
          )}
        </div>

        {/* Backstory */}
        {(character.backstory || isEditing) && (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-2 block font-oswald uppercase">
              Backstory
            </Label>
            {isEditing ? (
              <Textarea
                value={editedData.backstory}
                onChange={(e) =>
                  setEditedData({ ...editedData, backstory: e.target.value })
                }
                className="bg-[#0a0a0b] border-[#333] text-white font-courier text-sm min-h-[80px]"
                rows={4}
                placeholder="Character backstory..."
              />
            ) : (
              <p className="font-courier text-sm text-[#888] leading-relaxed whitespace-pre-wrap">
                {character.backstory || 'No backstory provided'}
              </p>
            )}
          </div>
        )}

        {/* Raw Data Fields */}
        {rawData && !isEditing && (
          <div className="p-4 bg-[#0a0a0b] border border-[#333] rounded text-xs">
            <Label className="text-[#666] text-xs mb-3 block font-oswald uppercase">
              Additional Info
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {rawData.emotional_archetype && (
                <div>
                  <span className="text-[#666]">Emotional Archetype:</span>
                  <span className="text-[#ccc] ml-2">
                    {rawData.emotional_archetype}
                  </span>
                </div>
              )}
              {rawData.first_appearance !== undefined && (
                <div>
                  <span className="text-[#666]">First Appearance:</span>
                  <span className="text-[#ccc] ml-2">
                    Scene {rawData.first_appearance}
                  </span>
                </div>
              )}
              {rawData.dialogue_style && (
                <div>
                  <span className="text-[#666]">Dialogue Style:</span>
                  <span className="text-[#ccc] ml-2">
                    {rawData.dialogue_style}
                  </span>
                </div>
              )}
              {rawData.costume_notes && (
                <div className="col-span-2">
                  <span className="text-[#666]">Costume Notes:</span>
                  <span className="text-[#ccc] ml-2">
                    {rawData.costume_notes}
                  </span>
                </div>
              )}
            </div>
            {rawData.relationships &&
              Object.keys(rawData.relationships).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#333]">
                  <span className="text-[#666] block mb-2">Relationships:</span>
                  <div className="space-y-1">
                    {Object.entries(rawData.relationships).map(
                      ([key, value]) => (
                        <div key={key} className="text-[#ccc]">
                          <span className="text-[#f5c518]">{key}:</span> {value}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Portrait Shot (MVP: Single shot only) */}
      <div className="p-6 border-t border-[#333]">
        <div className="mb-4">
          <h4 className="font-oswald text-lg uppercase tracking-wider text-white">
            Character Portrait
          </h4>
          <p className="font-courier text-xs text-[#666] mt-1">
            Generate or upload a reference portrait for this character
          </p>
        </div>

        <ShotCard
          character={character}
          shotType="portrait"
          title="Portrait Shot"
          aspectRatio="1:1"
          variants={variantsByShot?.get('portrait') || []}
        />
      </div>
    </div>
  );
}
