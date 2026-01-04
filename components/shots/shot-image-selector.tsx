'use client';

import { useState, useTransition } from 'react';
import {
  Image,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { shotImagesAction } from '@/hooks/use-server-action';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';
import { optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import type { ShotImageVariant } from '@/lib/drizzle/schema';

interface ShotImageSelectorProps {
  shotId: string;
  shotNumber: number;
  startFrameImageUrl: string | null;
  variants: ShotImageVariant[];
  compositionInstruction: string | null;
  onRefresh?: () => void;
  disabled?: boolean;
}

export function ShotImageSelector({
  shotId,
  shotNumber,
  startFrameImageUrl,
  variants,
  compositionInstruction,
  onRefresh,
  disabled = false,
}: ShotImageSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [modelSelection, setModelSelection] = useState<'seedream' | 'nano-banana' | 'both'>('both');

  const selectedVariant = variants.find((v) => v.is_selected);
  const hasApprovedImage = !!startFrameImageUrl;
  const hasComposition = !!compositionInstruction;

  // Count variants by status
  const stats = {
    generating: variants.filter((v) => v.status === 'generating').length,
    ready: variants.filter((v) => v.status === 'ready' || v.status === 'selected').length,
    failed: variants.filter((v) => v.status === 'failed').length,
  };

  const canGenerate = hasComposition && stats.generating === 0;

  const handleGenerateImages = () => {
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotImagesAction('generateShotImageVariants', shotId, modelSelection, apiKeys);
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to generate shot images:', result.error);
      }
    });
  };

  const handleSelectVariant = (variantId: string) => {
    startTransition(async () => {
      const result = await shotImagesAction('selectShotImageVariant', variantId);
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to select variant:', result.error);
      }
    });
  };

  const handleRetryVariant = (variantId: string) => {
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotImagesAction('retryShotImageVariant', variantId, apiKeys);
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to retry variant:', result.error);
      }
    });
  };

  const handleDeleteFailed = () => {
    startTransition(async () => {
      const result = await shotImagesAction('deleteFailedShotImageVariants', shotId);
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to delete failed variants:', result.error);
      }
    });
  };

  return (
    <div className="p-3 bg-[#0a0a0b] border border-[#333] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Image size={14} className="text-[#888]" />
          <span className="font-courier text-xs text-[#888]">
            Shot {shotNumber} Image
          </span>
          {hasApprovedImage && (
            <Badge className="bg-green-500/20 text-green-400 border-none text-xs">
              <CheckCircle size={10} className="mr-1" />
              Selected
            </Badge>
          )}
        </div>

        {/* Model Selection & Generate Button */}
        {canGenerate && (
          <div className="flex items-center gap-2">
            <select
              value={modelSelection}
              onChange={(e) => setModelSelection(e.target.value as typeof modelSelection)}
              disabled={disabled || isPending}
              className="h-7 px-2 text-xs bg-[#1c1c1f] border border-[#333] rounded text-[#888] font-courier"
            >
              <option value="both">Both Models</option>
              <option value="seedream">Seedream Only</option>
              <option value="nano-banana">Nano Banana Only</option>
            </select>
            <Button
              size="sm"
              onClick={handleGenerateImages}
              disabled={disabled || isPending}
              className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-courier text-xs h-7"
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Wand2 size={12} className="mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Status Summary */}
      {variants.length > 0 && (
        <div className="flex items-center gap-3 mb-3 text-xs font-courier">
          {stats.generating > 0 && (
            <span className="text-[#00f2ea]">
              <Loader2 size={10} className="inline mr-1 animate-spin" />
              {stats.generating} generating
            </span>
          )}
          {stats.ready > 0 && (
            <span className="text-green-400">
              <CheckCircle size={10} className="inline mr-1" />
              {stats.ready} ready
            </span>
          )}
          {stats.failed > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <XCircle size={10} className="inline" />
              {stats.failed} failed
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteFailed}
                disabled={disabled || isPending}
                className="h-5 px-1 text-red-400 hover:text-red-300"
              >
                <RefreshCw size={10} />
              </Button>
            </span>
          )}
        </div>
      )}

      {/* Variant Grid */}
      {variants.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              isSelected={variant.is_selected}
              onSelect={() => handleSelectVariant(variant.id)}
              onRetry={() => handleRetryVariant(variant.id)}
              disabled={disabled || isPending}
            />
          ))}
        </div>
      )}

      {/* No Composition Warning */}
      {!hasComposition && (
        <div className="text-center py-2">
          <p className="font-courier text-[#666] text-xs">
            No composition instruction available for this shot.
          </p>
        </div>
      )}

      {/* No Variants Yet */}
      {hasComposition && variants.length === 0 && !hasApprovedImage && (
        <div className="text-center py-2">
          <p className="font-courier text-[#666] text-xs">
            Click "Generate" to create images for this shot.
          </p>
        </div>
      )}

      {/* Selected Image Preview */}
      {hasApprovedImage && selectedVariant && (
        <div className="mt-3 pt-3 border-t border-[#333]">
          <div className="w-full aspect-video bg-[#1c1c1f] rounded overflow-hidden">
            <img
              src={optimizeImageUrl(startFrameImageUrl, IMAGE_SIZES.previewLarge)}
              alt={`Shot ${shotNumber} start frame`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p className="font-courier text-[#666] text-xs mt-1">
            Model: {selectedVariant.model.includes('seedream') ? 'Seedream' : 'Nano Banana'}
          </p>
        </div>
      )}
    </div>
  );
}

// Variant Card Sub-component
interface VariantCardProps {
  variant: ShotImageVariant;
  isSelected: boolean;
  onSelect: () => void;
  onRetry: () => void;
  disabled: boolean;
}

function VariantCard({
  variant,
  isSelected,
  onSelect,
  onRetry,
  disabled,
}: VariantCardProps) {
  const modelName = variant.model.includes('seedream') ? 'Seedream' : 'Nano Banana';

  return (
    <div
      className={`relative border rounded overflow-hidden ${
        isSelected
          ? 'border-[#f5c518]'
          : variant.status === 'failed'
          ? 'border-red-500/50'
          : 'border-[#333]'
      }`}
    >
      {/* Image or Placeholder */}
      <div className="aspect-video bg-[#1c1c1f]">
        {variant.status === 'generating' && (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#00f2ea]" />
          </div>
        )}
        {variant.status === 'failed' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <XCircle size={16} className="text-red-400" />
            <span className="font-courier text-red-400 text-xs">Failed</span>
          </div>
        )}
        {(variant.status === 'ready' || variant.status === 'selected') && variant.image_url && (
          <img
            src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.cardMedium)}
            alt={`${modelName} variant`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-[#0a0a0b] flex items-center justify-between">
        <span className="font-courier text-[#888] text-xs">{modelName}</span>

        {variant.status === 'ready' && !isSelected && (
          <Button
            size="sm"
            onClick={onSelect}
            disabled={disabled}
            className="h-6 px-2 text-xs bg-[#f5c518] hover:bg-[#d4a616] text-black font-courier"
          >
            Select
          </Button>
        )}

        {variant.status === 'selected' && (
          <Badge className="bg-green-500/20 text-green-400 border-none text-xs">
            <CheckCircle size={10} className="mr-1" />
            Selected
          </Badge>
        )}

        {variant.status === 'failed' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={disabled}
            className="h-6 px-2 text-xs border-[#333] text-[#888] hover:text-white font-courier"
          >
            <RefreshCw size={10} className="mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
