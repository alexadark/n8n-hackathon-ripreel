'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Play,
  MapPin,
  Camera,
  MessageSquare,
  Volume2,
  Settings,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Veo3PromptData } from '@/lib/drizzle/schema';

interface Veo3PromptEditorProps {
  promptData: Veo3PromptData | null;
  legacyPrompt?: string | null;
  dialogueSegment?: string | null;
  onSave: (data: Veo3PromptData) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface PromptCategory {
  key: keyof Veo3PromptData;
  label: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    key: 'subject',
    label: 'Subject',
    icon: <User size={14} />,
    description: 'Character description (15+ physical attributes)',
    placeholder: 'A woman in her 30s with auburn hair, freckles, wearing a leather jacket...',
  },
  {
    key: 'action',
    label: 'Action',
    icon: <Play size={14} />,
    description: 'Movements, gestures, camera motion',
    placeholder: 'She slowly turns toward the camera, her expression shifts from confusion to recognition...',
  },
  {
    key: 'scene',
    label: 'Scene',
    icon: <MapPin size={14} />,
    description: 'Environment, props, lighting setup',
    placeholder: 'Dimly lit warehouse interior, industrial metal shelving, single overhead fluorescent light...',
  },
  {
    key: 'style',
    label: 'Style',
    icon: <Camera size={14} />,
    description: 'Camera shot type, visual aesthetic',
    placeholder: 'Medium close-up, cinematic 2.39:1 aspect ratio, shallow depth of field, film grain...',
  },
  {
    key: 'dialogue',
    label: 'Dialogue',
    icon: <MessageSquare size={14} />,
    description: 'Character speech with tone (VEO 3.1 generates spoken audio)',
    placeholder: '"I knew you would come back." Spoken softly, with a hint of sadness...',
  },
  {
    key: 'sounds',
    label: 'Sounds',
    icon: <Volume2 size={14} />,
    description: 'Ambient, SFX, foley, music',
    placeholder: 'Distant thunder rumbling, rain pattering on metal roof, subtle tension drone...',
  },
  {
    key: 'technical',
    label: 'Technical',
    icon: <Settings size={14} />,
    description: 'Negative prompts and quality settings',
    placeholder: 'No subtitles, no watermarks, no text overlays, no jump cuts...',
  },
];

export function Veo3PromptEditor({
  promptData,
  legacyPrompt,
  dialogueSegment,
  onSave,
  disabled = false,
  className,
}: Veo3PromptEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [editedData, setEditedData] = useState<Veo3PromptData>({});

  // Debug: Log promptData when it changes
  useEffect(() => {
    console.log('🎬 [Veo3PromptEditor] promptData updated:', JSON.stringify(promptData, null, 2));
  }, [promptData]);

  const hasStructuredData = promptData && Object.values(promptData).some((v) => v);
  const hasLegacyPrompt = legacyPrompt && !hasStructuredData;

  const filledCategories = promptData
    ? PROMPT_CATEGORIES.filter((cat) => promptData[cat.key]).length
    : 0;

  // Initialize edited data when editing starts
  useEffect(() => {
    if (isEditing) {
      // Start with promptData, fall back to dialogue segment
      const initialData: Veo3PromptData = { ...promptData };
      if (!initialData.dialogue && dialogueSegment) {
        initialData.dialogue = dialogueSegment;
      }
      setEditedData(initialData);
    }
  }, [isEditing, promptData, dialogueSegment]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setEditedData(promptData || {});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('💾 [Veo3PromptEditor] Saving editedData:', JSON.stringify(editedData, null, 2));
    try {
      await onSave(editedData);
      console.log('💾 [Veo3PromptEditor] Save completed successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: keyof Veo3PromptData, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [key]: value || null,
    }));
  };

  return (
    <div className={cn('bg-[#0a0a0b] border border-[#333] rounded-lg', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 cursor-pointer hover:bg-[#1c1c1f] transition-colors rounded-t-lg',
          !isExpanded && 'rounded-b-lg'
        )}
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-courier text-[#666] text-xs uppercase">VEO 3.1 Prompt</span>
          {hasStructuredData ? (
            <span className="text-[#f5c518] text-xs font-courier">
              ({filledCategories}/{PROMPT_CATEGORIES.length} fields)
            </span>
          ) : hasLegacyPrompt ? (
            <span className="text-amber-500 text-xs font-courier">(legacy format)</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
              }}
              className="text-[#666] hover:text-[#f5c518] transition-colors p-1"
              title="Edit prompt"
              disabled={disabled}
            >
              <Edit3 size={14} />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-[#666]" />
          ) : (
            <ChevronDown size={14} className="text-[#666]" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#333] p-3 space-y-3">
          {/* Legacy Prompt Display (if no structured data) */}
          {hasLegacyPrompt && !isEditing && (
            <div className="mb-4">
              <button
                onClick={() => setShowLegacy(!showLegacy)}
                className="flex items-center gap-2 text-amber-500 text-xs font-courier mb-2 hover:text-amber-400"
              >
                <FileText size={12} />
                {showLegacy ? 'Hide' : 'Show'} Legacy Prompt
                {showLegacy ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showLegacy && (
                <div className="font-courier text-[#888] text-xs p-3 rounded border border-amber-500/30 bg-amber-500/5 max-h-40 overflow-y-auto">
                  {legacyPrompt}
                </div>
              )}
              <p className="font-courier text-amber-500/70 text-[10px] mt-2">
                Click Edit to convert to structured format for better control
              </p>
            </div>
          )}

          {/* Structured Fields */}
          {PROMPT_CATEGORIES.map((category) => {
            const value = isEditing
              ? editedData[category.key] || ''
              : promptData?.[category.key] || '';

            // Get default value for dialogue from dialogueSegment
            const defaultValue = category.key === 'dialogue' && !value && dialogueSegment
              ? dialogueSegment
              : '';

            const displayValue = value || defaultValue;

            return (
              <div key={category.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#f5c518]">{category.icon}</span>
                  <Label className="font-courier text-[#888] text-xs uppercase">
                    {category.label}
                  </Label>
                  {category.key === 'dialogue' && dialogueSegment && !promptData?.dialogue && (
                    <span className="text-[#555] text-[10px] font-courier">(from scene)</span>
                  )}
                </div>

                {isEditing ? (
                  <Textarea
                    value={editedData[category.key] || ''}
                    onChange={(e) => handleFieldChange(category.key, e.target.value)}
                    placeholder={category.placeholder}
                    className="bg-[#1c1c1f] border-[#444] text-white font-courier text-xs min-h-[60px] resize-y focus:border-[#f5c518]"
                    disabled={disabled || isSaving}
                  />
                ) : (
                  <div
                    className={cn(
                      'font-courier text-xs p-2 rounded border bg-[#1c1c1f]',
                      displayValue
                        ? 'text-[#aaa] border-[#333]'
                        : 'text-[#444] border-[#222] italic'
                    )}
                  >
                    {displayValue || 'Not set'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center gap-2 pt-3 border-t border-[#333]">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={disabled || isSaving}
                className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-courier text-xs h-7"
              >
                {isSaving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Save size={12} className="mr-1" />
                    Save All
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={disabled || isSaving}
                className="border-[#333] text-[#888] hover:text-white font-courier text-xs h-7"
              >
                <X size={12} className="mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
