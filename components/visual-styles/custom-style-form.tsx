"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { VisualStyle, StyleConfig } from "@/lib/drizzle/schema";
import { STYLE_CONFIG_GROUPS, type StyleConfigFieldKey } from "@/lib/visual-styles/types";
import { visualStylesAction } from "@/hooks/use-server-action";

interface CustomStyleFormProps {
  styles: VisualStyle[];
  onUseCustomConfig: (config: StyleConfig) => void;
  onStyleSaved?: (styleId: string) => void;
  className?: string;
}

/**
 * CustomStyleForm - Form for creating custom visual styles
 * Supports "start from" template, collapsible sections, save or use without saving
 */
export function CustomStyleForm({
  styles,
  onUseCustomConfig,
  onStyleSaved,
  className,
}: CustomStyleFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [styleName, setStyleName] = useState("");
  const [styleDescription, setStyleDescription] = useState("");
  const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section collapse states
  const [characterLocationOpen, setCharacterLocationOpen] = useState(false);
  const [videoAudioOpen, setVideoAudioOpen] = useState(false);

  // Handle template selection
  const handleTemplateSelect = (styleId: string) => {
    const template = styles.find((s) => s.id === styleId);
    if (template) {
      setSelectedTemplateId(styleId);
      setStyleConfig({ ...template.style_config });
      setStyleName(`${template.name} (Custom)`);
      setStyleDescription(`Custom style based on ${template.name}`);
    }
  };

  // Handle field change
  const handleFieldChange = (key: StyleConfigFieldKey, value: string) => {
    if (styleConfig) {
      setStyleConfig({ ...styleConfig, [key]: value });
    }
  };

  // Save as new style
  const handleSave = async () => {
    if (!styleConfig || !styleName.trim()) {
      setError("Please provide a style name");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await visualStylesAction('createCustomStyle', {
      name: styleName.trim(),
      description: styleDescription.trim() || `Custom visual style`,
      style_config: styleConfig,
    });

    setIsSaving(false);

    if (result.success && result.styleId) {
      onStyleSaved?.(result.styleId);
    } else {
      setError(result.error || "Failed to save style");
    }
  };

  // Use without saving
  const handleUseWithoutSaving = () => {
    if (styleConfig) {
      onUseCustomConfig(styleConfig);
    }
  };

  // Render a field group
  const renderFieldGroup = (
    groupKey: keyof typeof STYLE_CONFIG_GROUPS,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const group = STYLE_CONFIG_GROUPS[groupKey];
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-[#333] bg-[#0a0a0b]">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-[#1c1c1f] transition-colors">
          <span className="font-oswald uppercase tracking-wider text-sm text-[#888]">
            {group.label}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-[#666]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#666]" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 space-y-4 border-t border-[#333]">
          {group.fields.map((field) => (
            <div key={field.key}>
              <Label
                htmlFor={`custom-${field.key}`}
                className="block text-xs text-[#888] font-courier mb-1"
              >
                {field.label}
              </Label>
              <Textarea
                id={`custom-${field.key}`}
                value={styleConfig?.[field.key as StyleConfigFieldKey] || ""}
                onChange={(e) =>
                  handleFieldChange(field.key as StyleConfigFieldKey, e.target.value)
                }
                rows={2}
                className="w-full bg-[#1c1c1f] border-[#333] text-white font-courier text-xs resize-none focus:border-[#f5c518]"
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className={cn("border-t border-[#333] mt-6 pt-6", className)}>
      {/* Expand/Collapse Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[#888] hover:text-[#f5c518] transition-colors mb-4"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-oswald uppercase tracking-wider text-sm">
          Create Custom Style
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-6 bg-[#1c1c1f] border border-[#333] p-6">
          {/* Template Selection and Style Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="template-select"
                className="block text-xs text-[#f5c518] font-oswald uppercase tracking-wider mb-2"
              >
                Start From
              </Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-[#0a0a0b] border-[#333] text-white font-courier">
                  <SelectValue placeholder="Select a style as template..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1f] border-[#333]">
                  {styles.map((style) => (
                    <SelectItem
                      key={style.id}
                      value={style.id}
                      className="text-white font-courier hover:bg-[#333]"
                    >
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="style-name"
                className="block text-xs text-[#f5c518] font-oswald uppercase tracking-wider mb-2"
              >
                Style Name
              </Label>
              <Input
                id="style-name"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="My Custom Style"
                className="bg-[#0a0a0b] border-[#333] text-white font-courier focus:border-[#f5c518]"
              />
            </div>
          </div>

          {/* Style Description */}
          <div>
            <Label
              htmlFor="style-description"
              className="block text-xs text-[#888] font-courier mb-1"
            >
              Description (optional)
            </Label>
            <Input
              id="style-description"
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
              placeholder="Brief description of your style..."
              className="bg-[#0a0a0b] border-[#333] text-white font-courier text-sm focus:border-[#f5c518]"
            />
          </div>

          {/* Basic Settings (always visible when template selected) */}
          {styleConfig && (
            <>
              <div className="space-y-4">
                <h4 className="font-oswald uppercase tracking-wider text-sm text-[#f5c518] border-b border-[#333] pb-2">
                  Basic Settings
                </h4>
                {STYLE_CONFIG_GROUPS.basic.fields.map((field) => (
                  <div key={field.key}>
                    <Label
                      htmlFor={`basic-${field.key}`}
                      className="block text-xs text-[#888] font-courier mb-1"
                    >
                      {field.label}
                    </Label>
                    <Textarea
                      id={`basic-${field.key}`}
                      value={styleConfig[field.key as StyleConfigFieldKey] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.key as StyleConfigFieldKey, e.target.value)
                      }
                      rows={2}
                      className="w-full bg-[#0a0a0b] border-[#333] text-white font-courier text-xs resize-none focus:border-[#f5c518]"
                    />
                  </div>
                ))}
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-2">
                {renderFieldGroup("characterLocation", characterLocationOpen, setCharacterLocationOpen)}
                {renderFieldGroup("videoAudio", videoAudioOpen, setVideoAudioOpen)}
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-500 text-sm font-courier bg-red-500/10 border border-red-500/30 p-3">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#333]">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !styleName.trim()}
                  className="bg-[#f5c518] hover:bg-[#f5c518]/90 text-black font-oswald uppercase tracking-wider"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save as New Style"}
                </Button>
                <Button
                  type="button"
                  onClick={handleUseWithoutSaving}
                  variant="outline"
                  className="border-[#555] text-white hover:bg-[#333] font-oswald uppercase tracking-wider"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Use Without Saving
                </Button>
              </div>
            </>
          )}

          {/* Prompt to select template */}
          {!styleConfig && (
            <p className="text-[#666] font-courier text-sm">
              Select a style above as your starting template to customize.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
