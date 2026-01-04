'use client';

import { useState, useRef, useEffect } from 'react';
import { useRevalidator } from 'react-router';
import { Package, Sparkles, Check, Loader2, RefreshCw, Edit, X, Save, Upload, Wand2, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VariantGallery } from '@/components/bible/variant-gallery';
import { SimpleModelSelector, modelSelectionToArray, type SimpleModelSelection } from '@/components/bible/model-selector';
import { toast } from 'sonner';
import { bibleAction, bibleThreeShotAction } from '@/hooks/use-server-action';
import type { ProjectProp, BibleImageVariant } from '@/lib/drizzle/schema';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';

/* eslint-disable @next/next/no-img-element */

// Timeout for generation (5 minutes - Nano Banana Pro can take longer)
const GENERATION_TIMEOUT_MS = 300000;
// Polling interval (5 seconds)
const POLLING_INTERVAL_MS = 5000;

interface PropCardProps {
  prop: ProjectProp;
  variants?: BibleImageVariant[];
}

export function PropCard({ prop, variants = [] }: PropCardProps) {
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if this is a DESCRIBE prop (text-only, no image generation)
  const isDescribeProp = prop.generation_method === 'DESCRIBE';

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
  const [isConvertingToDescribe, setIsConvertingToDescribe] = useState(false);

  // Check if any variants are generating
  const hasGeneratingVariants = variants.some(v => v.status === 'generating');
  const isAnyGenerating = prop.image_status === 'generating' || hasGeneratingVariants;
  const hasReadyVariants = variants.some(v => v.status === 'ready' || v.status === 'selected');

  // Track previous generation state to detect completion
  const prevGeneratingRef = useRef(isAnyGenerating);

  const [editedData, setEditedData] = useState({
    name: prop.name,
    importance: prop.importance,
    visual_description: prop.visual_description,
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
      void bibleThreeShotAction('resetStuckVariants', 'prop', prop.id).then(result => {
        if (result.success) {
          const data = result.data as { resetCount?: number } | undefined;
          if (data?.resetCount && data.resetCount > 0) {
            console.log(`🔧 Auto-reset ${data.resetCount} stuck variant(s) for prop`);
            revalidator.revalidate();
          }
        }
      });
    }
    // Only run on mount/when variants change from props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prop.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await bibleAction('updateProp', prop.id, editedData);
      if (result.success) {
        toast.success('Prop updated');
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
      name: prop.name,
      importance: prop.importance,
      visual_description: prop.visual_description,
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
      const result = await bibleThreeShotAction('generateMultipleVariants', 'prop', prop.id, undefined, modelsToUse, apiKeys);
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
      const result = await bibleThreeShotAction('uploadPropImage', prop.id, {
        buffer,
        filename: file.name,
        contentType: file.type,
      });

      if (result.success) {
        toast.success('Prop image uploaded');
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
    if (!prop.approved_image_url) {
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
      const result = await bibleThreeShotAction('refinePropImage',
        prop.id,
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
      const result = await bibleThreeShotAction('addSingleVariant', 'prop', prop.id, undefined, addVariantModel, apiKeys);
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
      const result = await bibleAction('approveProp', prop.id);
      if (result.success) {
        toast.success('Prop approved');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to approve prop');
    } finally {
      setIsApproving(false);
    }
  };

  const handleConvertToDescribe = async () => {
    setIsConvertingToDescribe(true);
    try {
      const result = await bibleAction('updatePropToDescribe', prop.id);
      if (result.success) {
        toast.success('Prop marked as text-only (no image needed)');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to convert prop');
    } finally {
      setIsConvertingToDescribe(false);
    }
  };

  const statusColor = {
    pending: 'bg-[#f5c518]/20 text-[#f5c518]',
    generating: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-cyan-500/20 text-cyan-400',
    approved: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  const importanceColor = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-[#f5c518]/20 text-[#f5c518]',
    low: 'bg-[#333] text-[#666]',
  };

  const rawData = prop.raw_data as {
    material?: string;
    color?: string;
    size?: string;
    condition?: string;
    symbolic_meaning?: string;
    scenes_used?: number[];
  } | null;

  return (
    <div className={cn(
      "bg-[#1c1c1f] border rounded-lg overflow-hidden transition-colors",
      isDescribeProp
        ? "border-purple-500/30 hover:border-purple-500/50"
        : "border-[#333] hover:border-[#666]"
    )}>
      {/* Image Area - Different for DESCRIBE props */}
      {isDescribeProp ? (
        <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-[#141416] relative flex items-center justify-center">
          <div className="text-center p-4">
            <Package size={32} className="text-purple-400 mx-auto mb-2" />
            <p className="font-oswald text-purple-400 text-sm uppercase tracking-wider">Text Description Only</p>
            <p className="font-courier text-[#666] text-xs mt-1">No image needed</p>
          </div>

          {/* Text Only Badge */}
          <Badge className="absolute top-3 left-3 bg-purple-500/20 text-purple-400 border border-purple-500/50 font-oswald uppercase text-xs">
            Text Only
          </Badge>
        </div>
      ) : (
        <div className="aspect-square bg-[#141416] relative">
          {prop.approved_image_url ? (
            <img
              src={optimizeImageUrl(prop.approved_image_url, IMAGE_SIZES.cardSquare)}
              alt={prop.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package size={48} className="text-[#333]" />
            </div>
          )}

          {/* Status Badge */}
          <Badge
            className={cn(
              'absolute top-3 right-3 font-oswald uppercase text-xs',
              statusColor[prop.image_status]
            )}
          >
            {prop.image_status === 'generating' && (
              <Loader2 size={12} className="mr-1 animate-spin" />
            )}
            {prop.image_status}
          </Badge>

          {/* Importance Badge */}
          <Badge
            className={cn(
              'absolute top-3 left-3 font-oswald uppercase text-xs',
              importanceColor[prop.importance]
            )}
          >
            {prop.importance}
          </Badge>
        </div>
      )}

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
              className="border-[#e02f2f] text-[#e02f2f] hover:bg-[#e02f2f] hover:text-white"
              disabled={prop.image_status === 'approved' || isDescribeProp}
            >
              <Edit size={14} className="mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Name */}
        {isEditing ? (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-1 block">Prop Name</Label>
            <Input
              value={editedData.name}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              className="bg-[#0a0a0b] border-[#333] text-white"
            />
          </div>
        ) : (
          <h3 className="font-oswald text-xl uppercase tracking-wider text-white mb-4">
            {prop.name}
          </h3>
        )}

        {/* Importance */}
        {isEditing && (
          <div className="mb-4">
            <Label className="text-[#888] text-xs mb-1 block">Importance</Label>
            <Select
              value={editedData.importance}
              onValueChange={(value: 'high' | 'medium' | 'low') =>
                setEditedData({ ...editedData, importance: value })
              }
            >
              <SelectTrigger className="bg-[#0a0a0b] border-[#333] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Visual Description */}
        <div className="mb-4">
          <Label className="text-[#888] text-xs mb-1 block font-oswald uppercase">Visual Description</Label>
          {isEditing ? (
            <Textarea
              value={editedData.visual_description}
              onChange={(e) => setEditedData({ ...editedData, visual_description: e.target.value })}
              className="bg-[#0a0a0b] border-[#333] text-white font-courier text-sm min-h-[120px]"
              rows={6}
            />
          ) : (
            <p className="font-courier text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
              {prop.visual_description}
            </p>
          )}
        </div>

        {/* Scale Reference (for DESCRIBE props) */}
        {isDescribeProp && prop.scale_reference && (
          <div className="mb-4 p-3 bg-purple-900/10 border border-purple-500/30 rounded">
            <Label className="text-purple-400 text-xs mb-1 block font-oswald uppercase">Scale Reference</Label>
            <p className="font-courier text-sm text-purple-300">
              {prop.scale_reference}
            </p>
            <p className="font-courier text-xs text-[#666] mt-1">
              This size anchor will be used in scene descriptions
            </p>
          </div>
        )}

        {/* Raw Data Fields */}
        {rawData && (
          <div className="mb-4 p-3 bg-[#0a0a0b] border border-[#333] rounded text-xs">
            <Label className="text-[#666] text-xs mb-2 block font-oswald uppercase">Additional Info</Label>
            {rawData.material && (
              <div className="mb-2">
                <span className="text-[#666]">Material:</span>
                <span className="text-[#ccc] ml-2">{rawData.material}</span>
              </div>
            )}
            {rawData.color && (
              <div className="mb-2">
                <span className="text-[#666]">Color:</span>
                <span className="text-[#ccc] ml-2">{rawData.color}</span>
              </div>
            )}
            {rawData.size && (
              <div className="mb-2">
                <span className="text-[#666]">Size:</span>
                <span className="text-[#ccc] ml-2">{rawData.size}</span>
              </div>
            )}
            {rawData.condition && (
              <div className="mb-2">
                <span className="text-[#666]">Condition:</span>
                <span className="text-[#ccc] ml-2">{rawData.condition}</span>
              </div>
            )}
            {rawData.symbolic_meaning && (
              <div className="mb-2">
                <span className="text-[#666]">Symbolic Meaning:</span>
                <span className="text-[#ccc] ml-2">{rawData.symbolic_meaning}</span>
              </div>
            )}
            {rawData.scenes_used && rawData.scenes_used.length > 0 && (
              <div className="mb-2">
                <span className="text-[#666]">Scenes Used:</span>
                <span className="text-[#ccc] ml-2">
                  {rawData.scenes_used.map((s) => `Scene ${s}`).join(', ')}
                </span>
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
                prompt: prop.visual_description,
              }))}
              aspectRatio="1:1"
              onSelect={() => setShowVariants(false)}
              assetType="prop"
              assetId={prop.id}
            />
          </div>
        )}


        {/* Actions */}
        {!isEditing && (
          <div className="flex flex-col gap-2">
            {/* DESCRIBE props: Show auto-approved status */}
            {isDescribeProp && (
              <div className="w-full flex items-center justify-center gap-2 py-3 bg-purple-900/10 border border-purple-500/30 rounded">
                <Check size={16} className="text-purple-400" />
                <span className="font-oswald uppercase tracking-wider text-sm text-purple-400">
                  Auto-Approved (Text Only)
                </span>
              </div>
            )}

            {/* Generate with model selector - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.image_status !== 'approved' &&
              prop.image_status !== 'generating' && !showVariants && (
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
                    className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
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

            {/* Mark as Text Only - For props that don't need images */}
            {!isDescribeProp && prop.image_status === 'pending' && !showVariants && (
              <Button
                onClick={handleConvertToDescribe}
                disabled={isConvertingToDescribe}
                variant="outline"
                className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400"
              >
                {isConvertingToDescribe ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Package size={14} className="mr-2" />
                )}
                Mark as Text Only (No Image)
              </Button>
            )}

            {/* View All Variants - when variants exist and not showing - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.approved_image_url && variants.length > 0 && !showVariants &&
              prop.image_status !== 'approved' && prop.image_status !== 'generating' && (
                <Button
                  onClick={() => setShowVariants(true)}
                  variant="outline"
                  className="w-full border-[#666] text-[#ccc] hover:border-[#f5c518] hover:text-[#f5c518]"
                >
                  <Eye size={14} className="mr-2" />
                  View All Variants ({variants.length})
                </Button>
              )}

            {/* Add Variant - with model selector - NOT for DESCRIBE props */}
            {/* Only show when there are ready variants and no variants are generating */}
            {!isDescribeProp && prop.image_status !== 'approved' && !isAnyGenerating &&
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
                      className="bg-[#f5c518] hover:bg-white text-black"
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

            {/* Generating State - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.image_status === 'generating' && (
              <Button
                disabled
                className="w-full bg-[#333] text-[#888] font-oswald uppercase tracking-wider"
              >
                <Loader2 size={14} className="mr-2 animate-spin" />
                Generating...
              </Button>
            )}

            {/* Upload Button - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.image_status !== 'approved' &&
              prop.image_status !== 'generating' && (
                <>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    variant="outline"
                    className="w-full border-[#333] text-[#888] hover:border-[#f5c518] hover:text-[#f5c518]"
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

            {/* Refine Section - with model selector and prompt input - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.approved_image_url &&
              prop.image_status !== 'approved' &&
              prop.image_status !== 'generating' && (
                <div className="flex flex-col gap-2 p-3 bg-[#0a0a0b] rounded-lg border border-[#f5c518]/30">
                  <Label className="text-[#f5c518] text-xs font-oswald uppercase flex items-center gap-1">
                    <Wand2 size={12} />
                    Refine with AI (Image-to-Image)
                  </Label>
                  <Textarea
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[60px] focus:border-[#f5c518]"
                    rows={2}
                    placeholder="Describe what you want to change... (e.g., 'add more detail', 'change the angle')"
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
                      className="bg-[#f5c518] hover:bg-white text-black px-4"
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

            {/* Approve / Regenerate - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.image_status === 'ready' && (
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
                  className="border-[#333] text-[#888] hover:border-[#f5c518] hover:text-[#f5c518]"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            )}

            {/* Approved State - NOT for DESCRIBE props (they have their own display above) */}
            {!isDescribeProp && prop.image_status === 'approved' && (
              <div className="w-full flex items-center justify-center gap-2 py-2 text-green-400">
                <Check size={16} />
                <span className="font-oswald uppercase tracking-wider text-sm">
                  Approved
                </span>
              </div>
            )}

            {/* Failed State - NOT for DESCRIBE props */}
            {!isDescribeProp && prop.image_status === 'failed' && (
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
