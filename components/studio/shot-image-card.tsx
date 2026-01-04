'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRevalidator } from 'react-router';
import {
  Image as ImageIcon,
  Loader2,
  Check,
  XCircle,
  Trash2,
  Expand,
  Wand2,
  Camera,
  User,
  MapPin,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { shotImagesAction, shotsAction } from '@/hooks/use-server-action';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import type { SceneShot, ShotImageVariant } from '@/lib/drizzle/schema';

// =============================================================================
// Types
// =============================================================================

interface BibleData {
  characters: Array<{
    id: string;
    name: string;
    visual_dna: string;
    portrait_url: string | null;
  }>;
  location: {
    id: string;
    name: string;
    visual_description: string;
    image_url: string | null;
  } | null;
  props: Array<{
    id: string;
    name: string;
    visual_description: string;
    image_url: string | null;
  }>;
}

interface ShotImageCardProps {
  shot: SceneShot;
  variants: ShotImageVariant[];
  bibleData: BibleData;
  projectId: string;
}

// =============================================================================
// Constants
// =============================================================================

const MODEL_LABELS: Record<string, string> = {
  'seedream-4.5-image-to-image': 'Seedream 4.5',
  'nano-banana-pro-image-to-image': 'Nano Banana Pro',
  'seedream-4.5-text-to-image': 'Seedream 4.5',
  'nano-banana-pro-text-to-image': 'Nano Banana Pro',
};

const STATUS_COLORS = {
  pending: 'bg-[#f5c518]/20 text-[#f5c518]',
  generating: 'bg-blue-500/20 text-blue-400',
  ready: 'bg-cyan-500/20 text-cyan-400',
  selected: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

// =============================================================================
// Component
// =============================================================================

export function ShotImageCard({
  shot,
  variants,
  bibleData,
}: ShotImageCardProps) {
  const [isPending, startTransition] = useTransition();
  const [modelSelection, setModelSelection] = useState<'seedream' | 'nano-banana' | 'both'>('both');
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants.find((v) => v.is_selected)?.id || ''
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const revalidator = useRevalidator();

  // Determine if this shot has an approved image
  const hasApprovedImage = !!shot.start_frame_image_url;

  // Get the effective prompt for this shot
  // Priority: composition_instruction > composition_instruction_seedream > action_prompt
  const effectivePrompt = shot.composition_instruction
    || shot.composition_instruction_seedream
    || shot.composition_instruction_nano_banana
    || shot.action_prompt
    || '';
  const hasPrompt = !!effectivePrompt;

  // Count variants by status
  const stats = useMemo(() => ({
    generating: variants.filter((v) => v.status === 'generating').length,
    ready: variants.filter((v) => v.status === 'ready' || v.status === 'selected').length,
    failed: variants.filter((v) => v.status === 'failed').length,
    total: variants.length,
  }), [variants]);

  // Can generate if we have any prompt and nothing is currently generating
  const canGenerate = hasPrompt && stats.generating === 0;

  const handleRefresh = () => {
    revalidator.revalidate();
  };

  const handleGenerateImages = () => {
    startTransition(async () => {
      // Get API keys from localStorage
      const apiKeys = getApiKeysFromStorage();
      console.log('🔑 Sending API keys for shot image generation:', {
        hasAnthropicKey: !!apiKeys.anthropic,
        hasKieKey: !!apiKeys.kie,
      });

      const result = await shotImagesAction('generateShotImageVariants', shot.id, modelSelection, apiKeys);
      if (result.success) {
        handleRefresh();
      } else {
        console.error('Failed to generate shot images:', result.error);
      }
    });
  };

  const handleConfirmSelection = async () => {
    if (!selectedVariantId) return;

    setIsConfirming(true);
    try {
      const result = await shotImagesAction('selectShotImageVariant', selectedVariantId);
      if (result.success) {
        handleRefresh();
      } else {
        console.error('Failed to select variant:', result.error);
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (variant?.is_selected) return; // Can't delete selected variant

    setDeletingVariantId(variantId);
    try {
      const result = await shotImagesAction('deleteShotImageVariant', variantId);
      if (result.success) {
        if (selectedVariantId === variantId) {
          setSelectedVariantId('');
        }
        handleRefresh();
      } else {
        console.error('Failed to delete variant:', result.error);
      }
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleRetryVariant = (variantId: string) => {
    startTransition(async () => {
      // Get API keys from localStorage
      const apiKeys = getApiKeysFromStorage();
      const result = await shotImagesAction('retryShotImageVariant', variantId, apiKeys);
      if (result.success) {
        handleRefresh();
      } else {
        console.error('Failed to retry variant:', result.error);
      }
    });
  };

  const handleEditPrompt = () => {
    setEditedPrompt(effectivePrompt);
    setIsEditingPrompt(true);
  };

  const handleCancelEdit = () => {
    setIsEditingPrompt(false);
    setEditedPrompt('');
  };

  const handleSavePrompt = async () => {
    if (!editedPrompt.trim()) return;

    setIsSavingPrompt(true);
    try {
      // Update the shot's composition_instruction
      const result = await shotsAction('updateShotPrompt', shot.id, editedPrompt.trim());
      if (result.success) {
        setIsEditingPrompt(false);
        handleRefresh();
      } else {
        console.error('Failed to update prompt:', result.error);
      }
    } finally {
      setIsSavingPrompt(false);
    }
  };

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-[#f5c518]/20 text-[#f5c518] border border-[#f5c518]/50 font-oswald text-xs uppercase">
              Shot {shot.shot_number}
            </Badge>
            {shot.shot_type && (
              <span className="font-courier text-[#888] text-xs">
                {shot.shot_type}
              </span>
            )}
            {shot.shot_duration_seconds && (
              <span className="font-courier text-[#666] text-xs">
                {shot.shot_duration_seconds}s
              </span>
            )}
          </div>

          {/* Status Badge */}
          {hasApprovedImage && (
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-oswald uppercase">
              <Check size={10} className="mr-1" />
              Approved
            </Badge>
          )}
          {!hasApprovedImage && stats.generating > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50 text-xs font-oswald uppercase">
              <Loader2 size={10} className="mr-1 animate-spin" />
              Generating
            </Badge>
          )}
        </div>

        {/* Prompt Section - Editable */}
        <div className="mt-3">
          {isEditingPrompt ? (
            <div className="space-y-2">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter image generation prompt..."
                className="min-h-[80px] text-xs font-courier bg-[#0a0a0b] border-[#333] text-[#ccc] resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={isSavingPrompt || !editedPrompt.trim()}
                  className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-xs"
                >
                  {isSavingPrompt ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isSavingPrompt}
                  className="text-[#888] hover:text-white font-oswald uppercase text-xs"
                >
                  <X size={12} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              {hasPrompt ? (
                <p className="font-courier text-[#888] text-xs line-clamp-2 pr-8">
                  {effectivePrompt}
                </p>
              ) : (
                <p className="font-courier text-amber-400/80 text-xs italic">
                  No prompt - click edit to add one
                </p>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleEditPrompt}
                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[#666] hover:text-[#f5c518]"
              >
                <Pencil size={12} />
              </Button>
            </div>
          )}
        </div>

        {/* Bible Reference Images - Always show for debugging */}
        <div className="mt-3 pt-3 border-t border-[#333]/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-oswald text-[#888] text-xs uppercase">
              Reference Images ({bibleData.characters.length} chars, {bibleData.location ? '1 loc' : '0 loc'})
            </span>
          </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Location */}
              {bibleData.location && (
                <div className="relative group" title={bibleData.location.name}>
                  {bibleData.location.image_url ? (
                    <img
                      src={optimizeImageUrl(bibleData.location.image_url, IMAGE_SIZES.thumbnailSmall)}
                      alt={bibleData.location.name}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded object-cover border border-cyan-500/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[#141416] border border-[#333] flex items-center justify-center">
                      <MapPin size={14} className="text-[#555]" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-0.5">
                    <MapPin size={8} className="text-black" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-[#ccc] text-xs font-courier rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {bibleData.location.name}
                    {!bibleData.location.image_url && (
                      <span className="text-amber-400 ml-1">(no image)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Characters */}
              {bibleData.characters.map((character) => (
                <div key={character.id} className="relative group" title={character.name}>
                  {character.portrait_url ? (
                    <img
                      src={optimizeImageUrl(character.portrait_url, IMAGE_SIZES.thumbnailSmall)}
                      alt={character.name}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-full object-cover border border-[#f5c518]/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#141416] border border-[#333] flex items-center justify-center">
                      <User size={14} className="text-[#555]" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-[#f5c518] rounded-full p-0.5">
                    <User size={8} className="text-black" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-[#ccc] text-xs font-courier rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {character.name}
                    {!character.portrait_url && (
                      <span className="text-amber-400 ml-1">(no portrait)</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Warning if some references missing images */}
              {(
                (bibleData.location && !bibleData.location.image_url) ||
                bibleData.characters.some(c => !c.portrait_url)
              ) && (
                <span className="text-amber-400 text-xs font-courier ml-2">
                  ⚠ Missing images
                </span>
              )}
            </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Generate Button - Show if no variants yet */}
        {stats.total === 0 && (
          <div className="text-center py-6 bg-[#0a0a0b] rounded-lg border border-dashed border-[#333]">
            <ImageIcon size={32} className="mx-auto text-[#444] mb-3" />
            {hasPrompt ? (
              <>
                <p className="font-courier text-[#888] text-sm mb-4">
                  Generate starting frame images for this shot
                </p>
                <div className="flex items-center justify-center gap-2">
                  <select
                    value={modelSelection}
                    onChange={(e) => setModelSelection(e.target.value as typeof modelSelection)}
                    disabled={isPending}
                    className="h-9 px-3 text-xs bg-[#141416] border border-[#333] rounded text-[#ccc] font-courier"
                  >
                    <option value="both">Both Models</option>
                    <option value="seedream">Seedream 4.5</option>
                    <option value="nano-banana">Nano Banana Pro</option>
                  </select>
                  <Button
                    onClick={handleGenerateImages}
                    disabled={isPending}
                    className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Wand2 size={14} className="mr-2" />
                    )}
                    Generate
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-courier text-amber-400 text-sm mb-2">
                  No prompt available
                </p>
                <p className="font-courier text-[#666] text-xs">
                  Click the edit button above to add a prompt, then generate.
                </p>
              </>
            )}
          </div>
        )}

            {/* Variant Gallery */}
            {stats.total > 0 && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm font-oswald uppercase">
                    Select Best Image
                  </Label>
                  <span className="text-[#888] text-xs font-courier">
                    {stats.ready} / {stats.total} ready
                  </span>
                </div>

                {/* Variant Grid */}
                <RadioGroup value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <div className="grid grid-cols-2 gap-3">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={cn(
                          'bg-[#0a0a0b] border rounded-lg overflow-hidden cursor-pointer transition-all group',
                          selectedVariantId === variant.id
                            ? 'border-[#f5c518] ring-2 ring-[#f5c518]/50'
                            : 'border-[#333] hover:border-[#666]',
                          (variant.status === 'generating' || variant.status === 'failed') && 'opacity-60 cursor-not-allowed'
                        )}
                        onClick={() => (variant.status === 'ready' || variant.status === 'selected') && setSelectedVariantId(variant.id)}
                      >
                        {/* Image */}
                        <div className="aspect-video bg-[#141416] relative">
                          {variant.image_url ? (
                            <img
                              src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.cardMedium)}
                              alt={`Variant ${(variant.generation_order ?? 0) + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              {variant.status === 'generating' ? (
                                <>
                                  <Loader2 size={24} className="text-blue-400 animate-spin" />
                                  <span className="text-blue-400 text-xs font-oswald uppercase animate-pulse">
                                    Generating...
                                  </span>
                                </>
                              ) : variant.status === 'failed' ? (
                                <>
                                  <XCircle size={24} className="text-red-400" />
                                  <span className="text-red-400 text-xs font-oswald uppercase">
                                    Failed
                                  </span>
                                </>
                              ) : (
                                <ImageIcon size={24} className="text-[#333]" />
                              )}
                            </div>
                          )}

                          {/* Hover Overlay */}
                          {(variant.status === 'ready' || variant.status === 'selected') && variant.image_url && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(variant.image_url);
                                }}
                                className="h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full"
                              >
                                <Expand size={18} />
                              </Button>
                              {!variant.is_selected && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVariant(variant.id);
                                  }}
                                  disabled={deletingVariantId === variant.id}
                                  className="h-10 w-10 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full"
                                >
                                  {deletingVariantId === variant.id ? (
                                    <Loader2 size={18} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={18} />
                                  )}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Failed - Retry Button */}
                          {variant.status === 'failed' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryVariant(variant.id);
                                }}
                                disabled={isPending}
                                className="bg-red-500 hover:bg-red-400 text-white font-oswald uppercase text-xs"
                              >
                                Retry
                              </Button>
                            </div>
                          )}

                          {/* Status Badge */}
                          <Badge
                            className={cn(
                              'absolute top-2 right-2 font-oswald uppercase text-xs',
                              STATUS_COLORS[variant.status as keyof typeof STATUS_COLORS]
                            )}
                          >
                            {variant.status === 'generating' && (
                              <Loader2 size={10} className="mr-1 animate-spin" />
                            )}
                            {variant.status}
                          </Badge>

                          {/* Selected in DB Indicator */}
                          {variant.is_selected && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                              <Check size={12} />
                            </div>
                          )}

                          {/* Local Selection Indicator */}
                          {selectedVariantId === variant.id && variant.status === 'ready' && !variant.is_selected && (
                            <div className="absolute inset-0 bg-[#f5c518]/10 flex items-center justify-center pointer-events-none">
                              <div className="bg-[#f5c518] rounded-full p-2">
                                <Check size={20} className="text-black" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Model Label */}
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-oswald text-xs uppercase text-[#ccc]">
                              {MODEL_LABELS[variant.model] || variant.model}
                            </span>
                            {(variant.status === 'ready' || variant.status === 'selected') && (
                              <RadioGroupItem
                                value={variant.id}
                                id={variant.id}
                                className="border-[#f5c518] text-[#f5c518]"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {/* Confirm Button */}
                {stats.ready > 0 && !hasApprovedImage && (
                  <Button
                    onClick={handleConfirmSelection}
                    disabled={!selectedVariantId || isConfirming}
                    className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
                  >
                    {isConfirming ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Check size={14} className="mr-2" />
                    )}
                    Confirm Selection
                  </Button>
                )}

                {/* Generate More Button */}
                {canGenerate && !hasApprovedImage && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
                    <select
                      value={modelSelection}
                      onChange={(e) => setModelSelection(e.target.value as typeof modelSelection)}
                      disabled={isPending}
                      className="h-8 px-2 text-xs bg-[#141416] border border-[#333] rounded text-[#888] font-courier flex-1"
                    >
                      <option value="both">Both Models</option>
                      <option value="seedream">Seedream 4.5</option>
                      <option value="nano-banana">Nano Banana Pro</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateImages}
                      disabled={isPending}
                      className="border-[#333] text-[#888] hover:text-white font-oswald uppercase text-xs"
                    >
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <>
                          <Wand2 size={12} className="mr-1" />
                          Generate More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

        {/* Approved Image Display */}
        {hasApprovedImage && (
          <div className="mt-4 pt-4 border-t border-[#333]">
            <Label className="text-green-400 text-sm font-oswald uppercase mb-2 block">
              <Check size={12} className="inline mr-1" />
              Approved Start Frame
            </Label>
            <div className="aspect-video bg-[#0a0a0b] rounded-lg overflow-hidden border border-green-500/30">
              <img
                src={optimizeImageUrl(shot.start_frame_image_url!, IMAGE_SIZES.cardMedium)}
                alt={`Shot ${shot.shot_number} approved`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewImage(shot.start_frame_image_url)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={optimizeImageUrl(previewImage, IMAGE_SIZES.modal)}
              alt="Preview"
              decoding="async"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
            >
              <XCircle size={24} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
