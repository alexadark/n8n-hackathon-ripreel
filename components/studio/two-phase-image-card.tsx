"use client";

import { useState } from "react";
import { useRevalidator } from "react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, RefreshCw, Sparkles, Image as ImageIcon } from "lucide-react";
import type { Scene, SceneImage } from "@/lib/drizzle/schema";
import { imagesAction } from "@/hooks/use-server-action";
import { optimizeImageUrl, IMAGE_SIZES } from "@/lib/utils";

interface TwoPhaseImageCardProps {
  scene: Scene;
  nanoBananaData: {
    latest: SceneImage | null;
    approved: SceneImage | null;
  };
  fluxData: {
    latest: SceneImage | null;
    approved: SceneImage | null;
  };
}

export function TwoPhaseImageCard({
  scene,
  nanoBananaData,
  fluxData,
}: TwoPhaseImageCardProps) {
  const revalidator = useRevalidator();
  const [isGeneratingNanoBanana, setIsGeneratingNanoBanana] = useState(false);
  const [isGeneratingFlux, setIsGeneratingFlux] = useState(false);
  const [showNanoBananaFeedback, setShowNanoBananaFeedback] = useState(false);
  const [showFluxFeedback, setShowFluxFeedback] = useState(false);
  const [nanoBananaFeedback, setNanoBananaFeedback] = useState("");
  const [fluxFeedback, setFluxFeedback] = useState("");

  const handleGenerateNanoBanana = async () => {
    setIsGeneratingNanoBanana(true);
    const result = await imagesAction('generateNanoBananaImage', 
      scene.id,
      scene.full_data?.image_generation_prompt || ""
    );

    if (result.success) {
      revalidator.revalidate(); // Refresh to show new image
    } else {
      console.error("Failed to generate Nano Banana image:", result.error);
      alert("Failed to generate image: " + result.error);
    }
    setIsGeneratingNanoBanana(false);
  };

  const handleRegenerateNanoBanana = async () => {
    if (!nanoBananaData.latest) return;

    setIsGeneratingNanoBanana(true);
    const result = await imagesAction('regenerateNanoBananaImage', 
      scene.id,
      nanoBananaData.latest.id,
      scene.full_data?.image_generation_prompt || "",
      nanoBananaFeedback || undefined
    );

    if (result.success) {
      setShowNanoBananaFeedback(false);
      setNanoBananaFeedback("");
      revalidator.revalidate();
    } else {
      console.error("Failed to regenerate:", result.error);
      alert("Failed to regenerate: " + result.error);
    }
    setIsGeneratingNanoBanana(false);
  };

  const handleApproveNanoBanana = async () => {
    if (!nanoBananaData.latest) return;

    const result = await imagesAction('approveNanoBananaImage', nanoBananaData.latest.id);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error("Failed to approve:", result.error);
      alert("Failed to approve: " + result.error);
    }
  };

  const handleGenerateFlux = async () => {
    if (!nanoBananaData.approved) return;

    setIsGeneratingFlux(true);
    const result = await imagesAction('generateFluxEnhancement', 
      scene.id,
      nanoBananaData.approved.id,
      "Enhance with cinematic neo-noir aesthetic, 35mm film grain, high contrast chiaroscuro lighting"
    );

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error("Failed to generate Flux enhancement:", result.error);
      alert("Failed to enhance: " + result.error);
    }
    setIsGeneratingFlux(false);
  };

  const handleRegenerateFlux = async () => {
    if (!fluxData.latest || !nanoBananaData.approved) return;

    setIsGeneratingFlux(true);
    const result = await imagesAction('regenerateFluxEnhancement', 
      scene.id,
      fluxData.latest.id,
      nanoBananaData.approved.id,
      "Enhance with cinematic neo-noir aesthetic, 35mm film grain, high contrast chiaroscuro lighting",
      fluxFeedback || undefined
    );

    if (result.success) {
      setShowFluxFeedback(false);
      setFluxFeedback("");
      revalidator.revalidate();
    } else {
      console.error("Failed to regenerate Flux:", result.error);
      alert("Failed to regenerate: " + result.error);
    }
    setIsGeneratingFlux(false);
  };

  const handleApproveFlux = async () => {
    if (!fluxData.latest) return;

    const result = await imagesAction('approveFluxImage', fluxData.latest.id);

    if (result.success) {
      revalidator.revalidate();
      alert("✅ Image approved! Video and audio generation will start automatically.");
    } else {
      console.error("Failed to approve Flux:", result.error);
      alert("Failed to approve: " + result.error);
    }
  };

  return (
    <Card className="bg-[#1c1c1f] border-[#333] p-6">
      {/* Scene Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs">
            Scene {scene.scene_number}
          </Badge>
          <Badge variant="outline" className="border-[#333] text-[#666] font-courier text-xs">
            {scene.full_data?.interior_exterior}
          </Badge>
        </div>
        <h3 className="font-courier font-bold text-white text-sm uppercase mb-2">
          {scene.full_data?.slugline || scene.slugline}
        </h3>
      </div>

      {/* Two-Phase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 1: Nano Banana */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#f5c518]">
            <Sparkles size={16} className="text-[#f5c518]" />
            <h4 className="font-oswald uppercase text-[#f5c518] text-sm tracking-wider">
              Phase 1: Structure
            </h4>
          </div>

          {/* Nano Banana Image Preview */}
          <div className="aspect-video bg-[#0a0a0b] border border-[#333] rounded flex items-center justify-center relative overflow-hidden">
            {nanoBananaData.latest?.image_url ? (
              <>
                <img
                  src={optimizeImageUrl(nanoBananaData.latest.image_url, IMAGE_SIZES.cardMedium)}
                  alt="Nano Banana"
                  className="w-full h-full object-cover"
                />
                {nanoBananaData.approved && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-900/80 text-green-400 border border-green-700">
                      <Check size={12} className="mr-1" />
                      Approved
                    </Badge>
                  </div>
                )}
                {nanoBananaData.latest.status === "generating" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="text-[#f5c518] animate-spin" size={32} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <ImageIcon size={48} className="text-[#333] mx-auto mb-2" />
                <p className="text-[#666] font-courier text-xs">No image yet</p>
              </div>
            )}
          </div>

          {/* Nano Banana Controls */}
          <div className="space-y-2">
            {!nanoBananaData.latest ? (
              <button
                onClick={handleGenerateNanoBanana}
                disabled={isGeneratingNanoBanana}
                className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-sm tracking-wider px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingNanoBanana ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Structure
                  </>
                )}
              </button>
            ) : nanoBananaData.approved ? (
              <div className="p-3 bg-green-900/20 border border-green-800 rounded text-center">
                <p className="text-green-400 font-courier text-xs">
                  ✅ Approved - Ready for enhancement
                </p>
              </div>
            ) : (
              <>
                {/* Feedback textarea (optional) */}
                {showNanoBananaFeedback && (
                  <div className="mb-2">
                    <textarea
                      value={nanoBananaFeedback}
                      onChange={(e) => setNanoBananaFeedback(e.target.value)}
                      placeholder="Describe what you'd like to change (optional)..."
                      className="w-full bg-[#0a0a0b] border border-[#333] text-white font-courier text-xs p-2 rounded resize-none focus:outline-none focus:border-[#f5c518]"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {showNanoBananaFeedback ? (
                    <>
                      <button
                        onClick={() => {
                          setShowNanoBananaFeedback(false);
                          setNanoBananaFeedback("");
                        }}
                        className="flex-1 bg-[#333] hover:bg-[#555] text-white font-oswald uppercase text-xs px-3 py-2 transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleRegenerateNanoBanana}
                        disabled={isGeneratingNanoBanana || nanoBananaData.latest.status === "generating"}
                        className="flex-1 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} />
                        {nanoBananaFeedback ? "Modify" : "Improve"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowNanoBananaFeedback(true)}
                        disabled={isGeneratingNanoBanana || nanoBananaData.latest.status === "generating"}
                        className="flex-1 bg-[#333] hover:bg-[#555] text-white font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} />
                        Regenerate
                      </button>
                      <button
                        onClick={handleApproveNanoBanana}
                        disabled={nanoBananaData.latest.status === "generating"}
                        className="flex-1 bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="text-xs text-[#666] font-courier">
            <span className="font-bold text-[#888]">Model:</span> Reka Nano Banana Pro
            {nanoBananaData.latest && (
              <>
                <br />
                <span className="font-bold text-[#888]">Iteration:</span> {nanoBananaData.latest.refinement_iteration + 1}
              </>
            )}
          </div>
        </div>

        {/* Phase 2: Flux Enhancement */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#00f2ea]">
            <ImageIcon size={16} className="text-[#00f2ea]" />
            <h4 className="font-oswald uppercase text-[#00f2ea] text-sm tracking-wider">
              Phase 2: Cinematic
            </h4>
          </div>

          {/* Flux Image Preview */}
          <div className="aspect-video bg-[#0a0a0b] border border-[#333] rounded flex items-center justify-center relative overflow-hidden">
            {fluxData.latest?.image_url ? (
              <>
                <img
                  src={optimizeImageUrl(fluxData.latest.image_url, IMAGE_SIZES.cardMedium)}
                  alt="Flux Enhanced"
                  className="w-full h-full object-cover"
                />
                {fluxData.approved && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-900/80 text-green-400 border border-green-700">
                      <Check size={12} className="mr-1" />
                      Final
                    </Badge>
                  </div>
                )}
                {fluxData.latest.status === "generating" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="text-[#00f2ea] animate-spin" size={32} />
                  </div>
                )}
              </>
            ) : nanoBananaData.approved ? (
              <div className="text-center">
                <ImageIcon size={48} className="text-[#333] mx-auto mb-2" />
                <p className="text-[#666] font-courier text-xs">Ready to enhance</p>
              </div>
            ) : (
              <div className="text-center">
                <X size={48} className="text-[#333] mx-auto mb-2" />
                <p className="text-[#666] font-courier text-xs">Approve Phase 1 first</p>
              </div>
            )}
          </div>

          {/* Flux Controls */}
          <div className="space-y-2">
            {!nanoBananaData.approved ? (
              <div className="p-3 bg-[#0a0a0b] border border-[#333] rounded text-center">
                <p className="text-[#666] font-courier text-xs">
                  Waiting for Phase 1 approval
                </p>
              </div>
            ) : !fluxData.latest ? (
              <button
                onClick={handleGenerateFlux}
                disabled={isGeneratingFlux}
                className="w-full bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase text-sm tracking-wider px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingFlux ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} />
                    Enhance with Flux
                  </>
                )}
              </button>
            ) : fluxData.approved ? (
              <div className="p-3 bg-green-900/20 border border-green-800 rounded text-center">
                <p className="text-green-400 font-courier text-xs">
                  ✅ Final image approved
                </p>
              </div>
            ) : (
              <>
                {/* Feedback textarea (optional) */}
                {showFluxFeedback && (
                  <div className="mb-2">
                    <textarea
                      value={fluxFeedback}
                      onChange={(e) => setFluxFeedback(e.target.value)}
                      placeholder="Describe what you'd like to change (optional)..."
                      className="w-full bg-[#0a0a0b] border border-[#333] text-white font-courier text-xs p-2 rounded resize-none focus:outline-none focus:border-[#00f2ea]"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {showFluxFeedback ? (
                    <>
                      <button
                        onClick={() => {
                          setShowFluxFeedback(false);
                          setFluxFeedback("");
                        }}
                        className="flex-1 bg-[#333] hover:bg-[#555] text-white font-oswald uppercase text-xs px-3 py-2 transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleRegenerateFlux}
                        disabled={isGeneratingFlux || fluxData.latest.status === "generating"}
                        className="flex-1 bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} />
                        {fluxFeedback ? "Modify" : "Improve"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowFluxFeedback(true)}
                        disabled={isGeneratingFlux || fluxData.latest.status === "generating"}
                        className="flex-1 bg-[#333] hover:bg-[#555] text-white font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={14} />
                        Regenerate
                      </button>
                      <button
                        onClick={handleApproveFlux}
                        disabled={fluxData.latest.status === "generating"}
                        className="flex-1 bg-[#e02f2f] hover:bg-white hover:text-black text-white font-oswald uppercase text-xs px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        Approve Final
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="text-xs text-[#666] font-courier">
            <span className="font-bold text-[#888]">Model:</span> Flux Pro (Image-to-Image)
            {fluxData.latest && (
              <>
                <br />
                <span className="font-bold text-[#888]">Iteration:</span> {fluxData.latest.refinement_iteration + 1}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
