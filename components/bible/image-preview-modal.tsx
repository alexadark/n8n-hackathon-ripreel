'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

interface Variant {
  id: string;
  image_url: string;
  model: string;
  status: string;
  is_selected: boolean;
  prompt?: string;
}

interface ImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  variants: Variant[];
  initialIndex?: number;
  onSelect?: (variantId: string) => void;
  onDelete?: (variantId: string) => void;
  aspectRatio?: string;
}

const MODEL_LABELS: Record<string, string> = {
  'seedream-4.5-text-to-image': 'Seedream 4.5',
  'seedream-4.5-image-to-image': 'Seedream 4.5 (I2I)',
  'nano-banana-pro-text-to-image': 'Nano Banana Pro',
  'nano-banana-pro-image-to-image': 'Nano Banana Pro (I2I)',
  'flux-2-text-to-image': 'Flux.2',
  'flux-2-image-to-image': 'Flux.2 (I2I)',
};

export function ImagePreviewModal({
  open,
  onClose,
  variants,
  initialIndex = 0,
  onSelect,
  onDelete,
  aspectRatio = '1:1',
}: ImagePreviewModalProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Filter to only show variants with images
  const variantsWithImages = variants.filter(v => v.image_url && v.status !== 'generating');

  if (variantsWithImages.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#1c1c1f] border-[#333] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase tracking-wide text-[#f5c518]">
              No Images Available
            </DialogTitle>
          </DialogHeader>
          <p className="text-[#888] font-courier text-sm">
            No images are ready to preview yet.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const currentVariant = variantsWithImages[currentIndex] || variantsWithImages[0];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < variantsWithImages.length - 1;

  const handlePrev = (): void => {
    if (canGoPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = (): void => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelect = (): void => {
    if (onSelect && currentVariant) {
      onSelect(currentVariant.id);
      onClose();
    }
  };

  const handleDelete = (): void => {
    if (onDelete && currentVariant && !currentVariant.is_selected) {
      onDelete(currentVariant.id);
      // Move to next/prev variant after deletion
      if (currentIndex >= variantsWithImages.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0a0b] border-[#333] text-white max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <DialogTitle className="font-oswald uppercase tracking-wide text-white">
              Image Preview
            </DialogTitle>
            <Badge className="bg-[#333] text-[#888] font-courier text-xs">
              {currentIndex + 1} / {variantsWithImages.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#888] hover:text-white hover:bg-[#333]"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Image Container */}
        <div className="relative flex-1 flex items-center justify-center bg-[#141416] min-h-[400px]">
          {/* Navigation Arrows */}
          {variantsWithImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className={cn(
                  'absolute left-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full',
                  !canGoPrev && 'opacity-30 cursor-not-allowed'
                )}
              >
                <ChevronLeft size={24} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={!canGoNext}
                className={cn(
                  'absolute right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full',
                  !canGoNext && 'opacity-30 cursor-not-allowed'
                )}
              >
                <ChevronRight size={24} />
              </Button>
            </>
          )}

          {/* Image */}
          <div
            className={cn(
              'relative',
              aspectRatio === '1:1' && 'w-[500px] h-[500px]',
              aspectRatio === '4:3' && 'w-[600px] h-[450px]',
              aspectRatio === '9:16' && 'w-[350px] h-[622px]',
              aspectRatio === '16:9' && 'w-[700px] h-[394px]'
            )}
          >
            <img
              src={optimizeImageUrl(currentVariant.image_url, IMAGE_SIZES.modal)}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Selected Badge */}
            {currentVariant.is_selected && (
              <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2">
                <Check size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-[#333] bg-[#1c1c1f]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-oswald uppercase text-sm text-[#f5c518]">
                  {MODEL_LABELS[currentVariant.model] || currentVariant.model}
                </span>
                {currentVariant.is_selected && (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                    Selected
                  </Badge>
                )}
              </div>
              {currentVariant.prompt && (
                <p className="font-courier text-xs text-[#888] max-w-md truncate">
                  {currentVariant.prompt}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Delete Button */}
              {onDelete && !currentVariant.is_selected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              )}

              {/* Select Button */}
              {onSelect && currentVariant.status === 'ready' && !currentVariant.is_selected && (
                <Button
                  onClick={handleSelect}
                  className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
                >
                  <Check size={14} className="mr-1" />
                  Select This Image
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {variantsWithImages.length > 1 && (
          <div className="px-4 pb-4 bg-[#1c1c1f]">
            <div className="flex gap-2 overflow-x-auto py-2">
              {variantsWithImages.map((variant, index) => (
                <button
                  key={variant.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                    index === currentIndex
                      ? 'border-[#f5c518]'
                      : 'border-transparent hover:border-[#666]'
                  )}
                >
                  <img
                    src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.thumbnail)}
                    alt={`Thumbnail ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {variant.is_selected && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
