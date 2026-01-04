'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AI_MODELS } from '@/lib/bible/models';
import type { AIModel, ModelType } from '@/lib/bible/models';
import { Sparkles, Wand2 } from 'lucide-react';

interface ModelSelectorProps {
  value: AIModel;
  onChange: (value: AIModel) => void;
  disabled?: boolean;
  mode?: ModelType; // Filter by mode
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled,
  mode,
  className,
}: ModelSelectorProps) {
  // Filter models by mode if specified
  const availableModels = mode
    ? AI_MODELS.filter((m) => m.type === mode)
    : AI_MODELS;

  // Group models by type
  const textToImageModels = availableModels.filter((m) => m.type === 'text-to-image');
  const imageToImageModels = availableModels.filter((m) => m.type === 'image-to-image');

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select AI Model" />
      </SelectTrigger>
      <SelectContent>
        {textToImageModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-[#f5c518]">
              <Sparkles size={14} />
              Text-to-Image
            </SelectLabel>
            {textToImageModels.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex flex-col">
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs text-[#888]">{model.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {imageToImageModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-[#00f2ea]">
              <Wand2 size={14} />
              Image-to-Image
            </SelectLabel>
            {imageToImageModels.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex flex-col">
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs text-[#888]">{model.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Simple Model Selector (for Generate Options / Add Variant)
// ============================================================================

export type SimpleModelSelection = 'both' | 'seedream' | 'nano-banana';

interface SimpleModelSelectorProps {
  value: SimpleModelSelection;
  onChange: (value: SimpleModelSelection) => void;
  disabled?: boolean;
  className?: string;
  /** Show only single model options (for Add Variant) */
  singleOnly?: boolean;
}

const SIMPLE_MODEL_OPTIONS: { value: SimpleModelSelection; label: string; description?: string }[] = [
  {
    value: 'both',
    label: 'Both Models',
    description: '2 options to choose from',
  },
  {
    value: 'seedream',
    label: 'Seedream 4.5',
    description: 'Fast, good for web',
  },
  {
    value: 'nano-banana',
    label: 'Nano Banana Pro',
    description: 'Advanced text rendering',
  },
];

export function SimpleModelSelector({
  value,
  onChange,
  disabled = false,
  className,
  singleOnly = false,
}: SimpleModelSelectorProps): React.JSX.Element {
  const options = singleOnly
    ? SIMPLE_MODEL_OPTIONS.filter(opt => opt.value !== 'both')
    : SIMPLE_MODEL_OPTIONS;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SimpleModelSelection)}
      disabled={disabled}
    >
      <SelectTrigger
        className={`bg-[#0a0a0b] border-[#333] text-white font-courier text-xs focus:border-[#f5c518] focus:ring-[#f5c518]/20 ${className || ''}`}
      >
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent className="bg-[#1c1c1f] border-[#333]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-white font-courier text-xs hover:bg-[#333] focus:bg-[#333] cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-oswald uppercase tracking-wide">
                {option.label}
              </span>
              {option.description && (
                <span className="text-[#888] text-[10px]">
                  {option.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Convert SimpleModelSelection to array of model names for server action
 */
export function modelSelectionToArray(
  selection: SimpleModelSelection
): ('seedream' | 'nano-banana')[] {
  switch (selection) {
    case 'seedream':
      return ['seedream'];
    case 'nano-banana':
      return ['nano-banana'];
    case 'both':
    default:
      return ['seedream', 'nano-banana'];
  }
}
