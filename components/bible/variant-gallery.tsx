'use client';

import { useState, useMemo } from 'react';
import { useRevalidator } from 'react-router';
import { Image as ImageIcon, Loader2, Check, Trash2, Expand, AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { bibleThreeShotAction } from '@/hooks/use-server-action';
import { ImagePreviewModal } from '@/components/bible/image-preview-modal';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

interface Variant {
  id: string;
  image_url: string;
  model: string;
  status: string;
  generation_order: number;
  is_selected: boolean;
  prompt?: string;
}

interface VariantGalleryProps {
  variants: Variant[];
  aspectRatio: string;
  /** Callback when a variant is confirmed. Receives the selected image URL. */
  onSelect?: (selectedImageUrl: string) => void;
  /** Allow delete even after selection (for re-selection flow) */
  allowDelete?: boolean;
  /** Asset info for fixing duplicate selections */
  assetType?: 'character' | 'location' | 'prop';
  assetId?: string;
  shotType?: 'portrait' | 'three_quarter' | 'full_body';
}

export function VariantGallery({
  variants,
  aspectRatio,
  onSelect,
  allowDelete = true,
  assetType,
  assetId,
  shotType,
}: VariantGalleryProps) {
  const revalidator = useRevalidator();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants.find((v) => v.is_selected)?.id || ''
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [isFixing, setIsFixing] = useState(false);

  // Detect duplicate selected variants (data inconsistency)
  const selectedVariants = useMemo(
    () => variants.filter((v) => v.is_selected),
    [variants]
  );
  const hasDuplicateSelections = selectedVariants.length > 1;

  const handleConfirm = async (): Promise<void> => {
    if (!selectedVariantId) {
      toast.error('Please select a variant first');
      return;
    }

    const selectedVariant = variants.find(v => v.id === selectedVariantId);
    if (!selectedVariant) {
      toast.error('Selected variant not found');
      return;
    }

    setIsConfirming(true);
    try {
      const result = await bibleThreeShotAction('selectVariant', selectedVariantId);
      if (result.success) {
        toast.success('Variant selected successfully');
        // Pass the selected image URL to parent
        onSelect?.(selectedVariant.image_url);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to select variant');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDelete = async (variantId: string): Promise<void> => {
    // Don't allow deleting the selected variant (unless we have duplicates)
    const variant = variants.find(v => v.id === variantId);
    if (variant?.is_selected && !hasDuplicateSelections) {
      toast.error('Cannot delete the selected variant');
      return;
    }

    setDeletingVariantId(variantId);
    try {
      // If there are duplicate selections, use force delete
      const result = hasDuplicateSelections && variant?.is_selected
        ? await bibleThreeShotAction('forceDeleteVariant', variantId)
        : await bibleThreeShotAction('deleteVariant', variantId);
      if (result.success) {
        toast.success('Variant deleted');
        // If we deleted the locally selected one, clear selection
        if (selectedVariantId === variantId) {
          setSelectedVariantId('');
        }
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to delete variant');
      }
    } catch {
      toast.error('Failed to delete variant');
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleFixDuplicates = async (): Promise<void> => {
    if (!assetType || !assetId) {
      toast.error('Missing asset information');
      return;
    }

    setIsFixing(true);
    try {
      const result = await bibleThreeShotAction('fixDuplicateSelectedVariants', assetType, assetId, shotType);
      if (result.success) {
        toast.success(`Fixed ${(result.data as { fixedCount?: number })?.fixedCount || 0} duplicate selections`);
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to fix duplicates');
      }
    } catch {
      toast.error('Failed to fix duplicates');
    } finally {
      setIsFixing(false);
    }
  };

  const handleOpenPreview = (index: number): void => {
    setPreviewInitialIndex(index);
    setPreviewModalOpen(true);
  };

  const handleSelectFromModal = async (variantId: string): Promise<void> => {
    setIsConfirming(true);
    try {
      const result = await bibleThreeShotAction('selectVariant', variantId);
      if (result.success) {
        toast.success('Variant selected successfully');
        setSelectedVariantId(variantId);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to select variant');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDeleteFromModal = async (variantId: string): Promise<void> => {
    await handleDelete(variantId);
  };

  const statusColor = {
    pending: 'bg-[#f5c518]/20 text-[#f5c518]',
    generating: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-cyan-500/20 text-cyan-400',
    selected: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  const modelLabels: Record<string, string> = {
    'seedream-4.5-text-to-image': 'Seedream 4.5',
    'nano-banana-pro-text-to-image': 'Nano Banana Pro',
    'flux-2-text-to-image': 'Flux.2',
  };

  return (
    <div className="space-y-4">
      {/* Duplicate Selection Warning */}
      {hasDuplicateSelections && (
        <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-oswald uppercase mb-2">
            <AlertTriangle size={16} />
            Data Issue Detected
          </div>
          <p className="text-[#ccc] text-xs font-courier mb-3">
            Multiple variants are marked as selected ({selectedVariants.length} found).
            This can happen due to a sync issue. Click &quot;Fix&quot; to keep the most recent one.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleFixDuplicates}
              disabled={isFixing || !assetType || !assetId}
              className="bg-amber-500 hover:bg-amber-400 text-black font-oswald uppercase text-xs"
            >
              {isFixing ? (
                <Loader2 size={12} className="mr-1 animate-spin" />
              ) : (
                <Wrench size={12} className="mr-1" />
              )}
              Fix Duplicates
            </Button>
            <span className="text-[#888] text-xs font-courier self-center">
              Or delete one of the selected variants manually
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-white text-sm font-oswald uppercase">
          Select Best Image
        </Label>
        {variants.filter((v) => v.status === 'ready').length > 0 && (
          <span className="text-[#888] text-xs font-courier">
            {variants.filter((v) => v.status === 'ready').length} / {variants.length} ready
          </span>
        )}
      </div>

      {/* Variant Grid */}
      <RadioGroup value={selectedVariantId} onValueChange={setSelectedVariantId}>
        <div className="grid grid-cols-2 gap-4">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              className={cn(
                'bg-[#1c1c1f] border rounded-lg overflow-hidden cursor-pointer transition-all group',
                selectedVariantId === variant.id
                  ? 'border-[#f5c518] ring-2 ring-[#f5c518]/50'
                  : 'border-[#333] hover:border-[#666]',
                // Only disable generating and failed variants (allow ready and selected)
                (variant.status === 'generating' || variant.status === 'failed') && 'opacity-60 cursor-not-allowed'
              )}
              onClick={() => (variant.status === 'ready' || variant.status === 'selected') && setSelectedVariantId(variant.id)}
            >
              {/* Image */}
              <div
                className={cn(
                  'bg-[#141416] relative',
                  aspectRatio === '1:1' && 'aspect-square',
                  aspectRatio === '4:3' && 'aspect-[4/3]',
                  aspectRatio === '9:16' && 'aspect-[9/16]',
                  aspectRatio === '16:9' && 'aspect-[16/9]'
                )}
              >
                {variant.image_url ? (
                  <img
                    src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.cardSquare)}
                    alt={`Variant ${variant.generation_order + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#1a1a2e] to-[#141416]">
                    {variant.status === 'generating' ? (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
                          <Loader2 size={40} className="text-blue-400 animate-spin relative z-10" />
                        </div>
                        <span className="text-blue-400 text-sm font-oswald uppercase tracking-wider animate-pulse">
                          Generating...
                        </span>
                        <span className="text-[#666] text-xs font-courier">
                          {modelLabels[variant.model] || variant.model}
                        </span>
                      </>
                    ) : (
                      <ImageIcon size={32} className="text-[#333]" />
                    )}
                  </div>
                )}

                {/* Hover Overlay with Actions - show for ready, selected, and failed variants */}
                {(variant.status === 'ready' || variant.status === 'selected' || variant.status === 'failed') && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* Preview Button - only show if there's an image */}
                    {variant.image_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(index);
                        }}
                        className="h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full"
                      >
                        <Expand size={18} />
                      </Button>
                    )}
                    {/* Delete Button - show for failed variants, or non-selected ready/selected variants, or if duplicate selections */}
                    {allowDelete && (variant.status === 'failed' || !variant.is_selected || hasDuplicateSelections) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(variant.id);
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

                {/* Status Badge */}
                <Badge
                  className={cn(
                    'absolute top-2 right-2 font-oswald uppercase text-xs',
                    statusColor[variant.status as keyof typeof statusColor]
                  )}
                >
                  {variant.status === 'generating' && (
                    <Loader2 size={10} className="mr-1 animate-spin" />
                  )}
                  {variant.status}
                </Badge>

                {/* Currently Selected in DB Indicator */}
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
                    {modelLabels[variant.model] || variant.model}
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
      {variants.some((v) => v.status === 'ready' || v.status === 'selected') && (
        <Button
          onClick={handleConfirm}
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

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        variants={variants.map(v => ({
          id: v.id,
          image_url: v.image_url,
          model: v.model,
          status: v.status,
          is_selected: v.is_selected,
          prompt: v.prompt,
        }))}
        initialIndex={previewInitialIndex}
        onSelect={handleSelectFromModal}
        onDelete={allowDelete ? handleDeleteFromModal : undefined}
        aspectRatio={aspectRatio}
      />
    </div>
  );
}
