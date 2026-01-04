'use client';

import { useState, useRef, useEffect } from 'react';
import { useRevalidator } from 'react-router';
import {
  MapPin,
  Sparkles,
  Check,
  Loader2,
  RefreshCw,
  Edit,
  X,
  Save,
  Home,
  Sun,
  Upload,
  Wand2,
  Plus,
  Eye,
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
import { VariantGallery } from '@/components/bible/variant-gallery';
import { SimpleModelSelector, modelSelectionToArray, type SimpleModelSelection } from '@/components/bible/model-selector';
import { toast } from 'sonner';
import { bibleAction, bibleThreeShotAction } from '@/hooks/use-server-action';
import type { ProjectLocation, BibleImageVariant } from '@/lib/drizzle/schema';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';

/* eslint-disable @next/next/no-img-element */

// Timeout for generation (5 minutes - Nano Banana Pro can take longer)
const GENERATION_TIMEOUT_MS = 300000;
// Polling interval (5 seconds)
const POLLING_INTERVAL_MS = 5000;

interface LocationCardProps {
  location: ProjectLocation;
  variants?: BibleImageVariant[];
}

export function LocationCard({ location, variants = [] }: LocationCardProps) {
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [showVariants, setShowVariants] = useState(variants.length > 0);

  const [refinementPrompt, setRefinementPrompt] = useState('');

  // Model selection states
  const [selectedModel, setSelectedModel] = useState<SimpleModelSelection>('both');
  const [addVariantModel, setAddVariantModel] = useState<SimpleModelSelection>('seedream');
  const [refineModel, setRefineModel] = useState<SimpleModelSelection>('seedream');

  // Check if any variants are generating
  const hasGeneratingVariants = variants.some(v => v.status === 'generating');
  const isAnyGenerating = location.image_status === 'generating' || hasGeneratingVariants;
  const hasReadyVariants = variants.some(v => v.status === 'ready' || v.status === 'selected');

  // Track previous generation state to detect completion
  const prevGeneratingRef = useRef(isAnyGenerating);

  const [editedData, setEditedData] = useState({
    name: location.name,
    type: location.type,
    visual_description: location.visual_description,
    time_variants: location.time_variants || {
      day: '',
      night: '',
      dawn: '',
      dusk: '',
    },
  });

  // Sync showVariants state with variants prop changes
  useEffect(() => {
    setShowVariants(variants.length > 0);
  }, [variants.length]);

  // Detect when generation completes and show success toast
  useEffect(() => {
    if (prevGeneratingRef.current && !isAnyGenerating && hasReadyVariants) {
      toast.success('Your image is generated');
    }
    prevGeneratingRef.current = isAnyGenerating;
  }, [isAnyGenerating, hasReadyVariants]);

  // Timeout for generation status (no individual polling - parent handles it via BibleAutoRefresh)
  useEffect(() => {
    if (!isAnyGenerating) return;

    // Set up timeout only - polling is handled by parent BibleAutoRefresh component
    const timeout = setTimeout(() => {
      toast.error('Generation timed out. Please try again.');
      revalidator.revalidate();
    }, GENERATION_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAnyGenerating, revalidator]);

  // Auto-fix stuck variants on mount (for existing projects with stuck generations)
  useEffect(() => {
    const hasStuckVariants = variants.some(v => v.status === 'generating');
    if (hasStuckVariants) {
      // Check and reset any stuck variants (older than 5 minutes)
      void bibleThreeShotAction('resetStuckVariants', 'location', location.id).then(result => {
        if (result.success) {
          const data = result.data as { resetCount?: number } | undefined;
          if (data?.resetCount && data.resetCount > 0) {
            console.log(`🔧 Auto-reset ${data.resetCount} stuck variant(s) for location`);
            revalidator.revalidate();
          }
        }
      });
    }
    // Only run on mount/when variants change from props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Clean up empty time variants
      const cleanedVariants = Object.fromEntries(
        Object.entries(editedData.time_variants).filter(
          ([_, value]) => value && value.trim()
        )
      );

      const result = await bibleAction('updateLocation', location.id, {
        ...editedData,
        time_variants:
          Object.keys(cleanedVariants).length > 0 ? cleanedVariants : null,
      });
      if (result.success) {
        toast.success('Location updated');
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
      name: location.name,
      type: location.type,
      visual_description: location.visual_description,
      time_variants: location.time_variants || {
        day: '',
        night: '',
        dawn: '',
        dusk: '',
      },
    });
    setIsEditing(false);
  };

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    setShowVariants(true);
    try {
      const modelsToUse = modelSelectionToArray(selectedModel);
      const apiKeys = getApiKeysFromStorage();
      toast.info('Generating your image...', { duration: 3000 });
      const result = await bibleThreeShotAction('generateMultipleVariants', 'location', location.id, undefined, modelsToUse, apiKeys);
      if (result.success) {
        revalidator.revalidate();
      } else {
        toast.error(result.error);
        setShowVariants(false);
      }
    } catch {
      toast.error('Failed to start generation');
      setShowVariants(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await bibleThreeShotAction('uploadLocationImage', location.id, {
        buffer,
        filename: file.name,
        contentType: file.type,
      });

      if (result.success) {
        toast.success('Location image uploaded');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRefine = async (): Promise<void> => {
    if (!location.approved_image_url) {
      toast.error('No image to refine');
      return;
    }

    // Only allow single models for refinement
    if (refineModel === 'both') {
      toast.error('Please select a specific model for refinement');
      return;
    }

    const modelToUse = refineModel === 'seedream'
      ? 'seedream-4.5-text-to-image'
      : 'nano-banana-pro-text-to-image';

    setIsRefining(true);
    setShowVariants(true); // Show variants gallery since refinement creates a variant
    try {
      const apiKeys = getApiKeysFromStorage();
      toast.info('Generating your image...', { duration: 3000 });
      const result = await bibleThreeShotAction('refineLocationImage',
        location.id,
        modelToUse,
        refinementPrompt || undefined,
        apiKeys
      );

      if (result.success) {
        setRefinementPrompt('');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to start refinement');
    } finally {
      setIsRefining(false);
    }
  };

  const handleAddVariant = async (): Promise<void> => {
    // Only allow single models for Add Variant
    if (addVariantModel === 'both') {
      toast.error('Please select a specific model');
      return;
    }

    setIsAddingVariant(true);
    setShowVariants(true);
    try {
      const apiKeys = getApiKeysFromStorage();
      toast.info('Generating your image...', { duration: 3000 });
      const result = await bibleThreeShotAction('addSingleVariant', 'location', location.id, undefined, addVariantModel, apiKeys);
      if (result.success) {
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to add variant');
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await bibleThreeShotAction('approveLocationImage', location.id);
      if (result.success) {
        toast.success('Location image approved');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to approve location');
    } finally {
      setIsApproving(false);
    }
  };

  const statusColor = {
    pending: 'bg-[#f5c518]/20 text-[#f5c518]',
    generating: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-cyan-500/20 text-cyan-400',
    approved: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  const rawData = location.raw_data as {
    atmosphere?: string;
    key_features?: string[];
    lighting_notes?: string;
    sound_ambience?: string;
  } | null;

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg overflow-hidden hover:border-[#666] transition-colors">
      {/* Image Area */}
      <div className="aspect-video bg-[#141416] relative">
        {location.approved_image_url ? (
          <img
            src={optimizeImageUrl(location.approved_image_url, IMAGE_SIZES.cardMedium)}
            alt={location.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin size={48} className="text-[#333]" />
          </div>
        )}

        {/* Status Badge */}
        <Badge
          className={cn(
            'absolute top-3 right-3 font-oswald uppercase text-xs',
            statusColor[location.image_status]
          )}
        >
          {location.image_status === 'generating' && (
            <Loader2 size={12} className="mr-1 animate-spin" />
          )}
          {location.image_status}
        </Badge>

        {/* Type Badge */}
        <Badge
          className={cn(
            'absolute top-3 left-3 font-oswald uppercase text-xs',
            location.type === 'interior'
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-cyan-500/20 text-cyan-400'
          )}
        >
          {location.type === 'interior' ? (
            <Home size={12} className="mr-1" />
          ) : (
            <Sun size={12} className="mr-1" />
          )}
          {location.type === 'interior' ? 'INT' : 'EXT'}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Edit Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
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
              className="border-[#00f2ea] text-[#00f2ea] hover:bg-[#00f2ea] hover:text-black"
              disabled={location.image_status === 'approved'}
            >
              <Edit size={14} className="mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Name */}
        {isEditing ? (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-1 block">
              Location Name
            </Label>
            <Input
              value={editedData.name}
              onChange={(e) =>
                setEditedData({ ...editedData, name: e.target.value })
              }
              className="bg-[#0a0a0b] border-[#333] text-white"
            />
          </div>
        ) : (
          <h3 className="font-oswald text-xl uppercase tracking-wider text-white mb-4">
            {location.name}
          </h3>
        )}

        {/* Type */}
        {isEditing && (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-1 block">Type</Label>
            <Select
              value={editedData.type}
              onValueChange={(value: 'interior' | 'exterior') =>
                setEditedData({ ...editedData, type: value })
              }
            >
              <SelectTrigger className="bg-[#0a0a0b] border-[#333] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interior">Interior (INT)</SelectItem>
                <SelectItem value="exterior">Exterior (EXT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Visual Description */}
        <div className="mb-4">
          <Label className="text-[#888] text-xs mb-1 block font-oswald uppercase">
            Visual Description
          </Label>
          {isEditing ? (
            <Textarea
              value={editedData.visual_description}
              onChange={(e) =>
                setEditedData({
                  ...editedData,
                  visual_description: e.target.value,
                })
              }
              className="bg-[#0a0a0b] border-[#333] text-white font-courier text-sm min-h-[120px]"
              rows={6}
            />
          ) : (
            <p className="font-courier text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
              {location.visual_description}
            </p>
          )}
        </div>

        {/* Time Variants */}
        {(location.time_variants || isEditing) && (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-2 block font-oswald uppercase">
              Time Variants
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                {(['day', 'night', 'dawn', 'dusk'] as const).map((variant) => (
                  <div key={variant}>
                    <Label className="text-[#666] text-xs capitalize">
                      {variant}
                    </Label>
                    <Textarea
                      value={editedData.time_variants[variant] || ''}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          time_variants: {
                            ...editedData.time_variants,
                            [variant]: e.target.value,
                          },
                        })
                      }
                      className="bg-[#0a0a0b] border-[#333] text-white font-courier text-xs min-h-[60px] mt-1"
                      rows={2}
                      placeholder={`${variant} variant description...`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {location.time_variants &&
                  Object.entries(location.time_variants).map(
                    ([variant, description]) => (
                      <div
                        key={variant}
                        className="p-2 bg-[#0a0a0b] border border-[#333] rounded"
                      >
                        <Badge
                          variant="outline"
                          className="border-[#333] text-[#666] text-xs mb-1 capitalize"
                        >
                          {variant}
                        </Badge>
                        <p className="font-courier text-xs text-[#888] mt-1">
                          {description}
                        </p>
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        )}

        {/* Raw Data Fields */}
        {rawData && (
          <div className="mb-4 p-3 bg-[#0a0a0b] border border-[#333] rounded text-xs">
            <Label className="text-[#666] text-xs mb-2 block font-oswald uppercase">
              Additional Info
            </Label>
            {rawData.atmosphere && (
              <div className="mb-2">
                <span className="text-[#666]">Atmosphere:</span>
                <span className="text-[#ccc] ml-2">{rawData.atmosphere}</span>
              </div>
            )}
            {rawData.lighting_notes && (
              <div className="mb-2">
                <span className="text-[#666]">Lighting Notes:</span>
                <span className="text-[#ccc] ml-2">
                  {rawData.lighting_notes}
                </span>
              </div>
            )}
            {rawData.sound_ambience && (
              <div className="mb-2">
                <span className="text-[#666]">Sound Ambience:</span>
                <span className="text-[#ccc] ml-2">
                  {rawData.sound_ambience}
                </span>
              </div>
            )}
            {rawData.key_features && rawData.key_features.length > 0 && (
              <div className="mb-2">
                <span className="text-[#666]">Key Features:</span>
                <ul className="list-disc list-inside text-[#ccc] ml-2 mt-1">
                  {rawData.key_features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Variant Gallery (show when variants exist and showVariants is true) */}
        {!isEditing && showVariants && variants.length > 0 && (
          <div className="mb-3">
            <VariantGallery
              variants={variants.map((v) => ({
                id: v.id,
                image_url: v.image_url || '',
                model: v.model,
                status: v.status || 'pending',
                generation_order: v.generation_order || 0,
                is_selected: v.is_selected || false,
                prompt: location.visual_description,
              }))}
              aspectRatio="16:9"
              onSelect={() => setShowVariants(false)}
              assetType="location"
              assetId={location.id}
            />
          </div>
        )}


        {/* Actions */}
        {!isEditing && (
          <div className="flex flex-col gap-2">
            {/* Generate with model selector */}
            {location.image_status !== 'approved' &&
              location.image_status !== 'generating' && !showVariants && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[#888] text-xs font-oswald uppercase shrink-0">
                      Model:
                    </Label>
                    <SimpleModelSelector
                      value={selectedModel}
                      onChange={setSelectedModel}
                      disabled={isGenerating}
                      className="flex-1"
                    />
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase tracking-wider"
                  >
                    {isGenerating ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Sparkles size={14} className="mr-2" />
                    )}
                    {selectedModel === 'both' ? 'Generate 2 Options' : 'Generate Option'}
                  </Button>
                </div>
              )}

            {/* View All Variants - when variants exist and not showing */}
            {location.approved_image_url && variants.length > 0 && !showVariants &&
              location.image_status !== 'approved' && location.image_status !== 'generating' && (
                <Button
                  onClick={() => setShowVariants(true)}
                  variant="outline"
                  className="w-full border-[#666] text-[#ccc] hover:border-[#00f2ea] hover:text-[#00f2ea]"
                >
                  <Eye size={14} className="mr-2" />
                  View All Variants ({variants.length})
                </Button>
              )}

            {/* Add Variant - with model selector */}
            {/* Only show when there are ready variants and no variants are generating */}
            {location.image_status !== 'approved' && !isAnyGenerating &&
              hasReadyVariants && (
                <div className="flex flex-col gap-2 p-2 bg-[#141416] rounded-lg border border-[#333]">
                  <Label className="text-[#888] text-xs font-oswald uppercase">
                    Add New Variant
                  </Label>
                  <div className="flex gap-2">
                    <SimpleModelSelector
                      value={addVariantModel}
                      onChange={setAddVariantModel}
                      disabled={isAddingVariant}
                      singleOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddVariant}
                      disabled={isAddingVariant}
                      size="sm"
                      className="bg-[#00f2ea] hover:bg-white text-black"
                    >
                      {isAddingVariant ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              )}

            {/* Generating State */}
            {location.image_status === 'generating' && (
              <Button
                disabled
                className="w-full bg-[#333] text-[#888] font-oswald uppercase tracking-wider"
              >
                <Loader2 size={14} className="mr-2 animate-spin" />
                Generating...
              </Button>
            )}

            {/* Upload Button */}
            {location.image_status !== 'approved' &&
              location.image_status !== 'generating' && (
                <>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    variant="outline"
                    className="w-full border-[#333] text-[#888] hover:border-[#00f2ea] hover:text-[#00f2ea]"
                  >
                    {isUploading ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Upload size={14} className="mr-2" />
                    )}
                    Upload Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </>
              )}

            {/* Refine Section - with model selector and prompt input */}
            {location.approved_image_url &&
              location.image_status !== 'approved' &&
              location.image_status !== 'generating' && (
                <div className="flex flex-col gap-2 p-3 bg-[#0a0a0b] rounded-lg border border-[#00f2ea]/30">
                  <Label className="text-[#00f2ea] text-xs font-oswald uppercase flex items-center gap-1">
                    <Wand2 size={12} />
                    Refine with AI (Image-to-Image)
                  </Label>
                  <Textarea
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[60px] focus:border-[#00f2ea]"
                    rows={2}
                    placeholder="Describe what you want to change... (e.g., 'make the lighting warmer', 'add more atmosphere')"
                  />
                  <div className="flex gap-2">
                    <SimpleModelSelector
                      value={refineModel}
                      onChange={setRefineModel}
                      disabled={isRefining}
                      singleOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={handleRefine}
                      disabled={isRefining || !refinementPrompt.trim()}
                      size="sm"
                      className="bg-[#00f2ea] hover:bg-white text-black px-4"
                    >
                      {isRefining ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Wand2 size={14} className="mr-1" />
                          Refine
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            {/* Approve / Regenerate */}
            {location.image_status === 'ready' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-oswald uppercase tracking-wider"
                >
                  {isApproving ? (
                    <Loader2 size={14} className="mr-2 animate-spin" />
                  ) : (
                    <Check size={14} className="mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  variant="outline"
                  className="border-[#333] text-[#888] hover:border-[#00f2ea] hover:text-[#00f2ea]"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            )}

            {/* Approved State */}
            {location.image_status === 'approved' && (
              <div className="w-full flex items-center justify-center gap-2 py-2 text-green-400">
                <Check size={16} />
                <span className="font-oswald uppercase tracking-wider text-sm">
                  Approved
                </span>
              </div>
            )}

            {/* Failed State */}
            {location.image_status === 'failed' && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-oswald uppercase tracking-wider"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={14} className="mr-2" />
                )}
                Retry Generation
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
