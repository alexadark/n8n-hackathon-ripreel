"use client";

import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { Film, Loader2 } from "lucide-react";
import type { Project, Scene } from "@/lib/drizzle/schema";

interface ScenesLoaderProps {
  initialProject: Project;
  initialScenes: Scene[];
}

export function ScenesLoader({ initialProject, initialScenes }: ScenesLoaderProps) {
  const revalidator = useRevalidator();
  const [isPolling, setIsPolling] = useState(
    initialProject.status === "parsing" && initialScenes.length === 0
  );

  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const url = `/api/projects/${initialProject.id}/status`;
        console.log("🔄 Polling project status:", url);

        const response = await fetch(url);

        if (!response.ok) {
          console.error("API returned error status:", response.status);
          return;
        }

        const data = await response.json();
        console.log("✅ Status poll response:", data);

        if (data.status === "scene_validation" || data.sceneCount > 0) {
          // Scenes are ready! Refresh the page to show them
          console.log("🎉 Scenes are ready! Refreshing page...");
          setIsPolling(false);
          revalidator.revalidate();
        }
      } catch (error) {
        console.error("Error polling project status:", error);
      }
    }, 10000); // Poll every 10 seconds (reduced from 3s for performance)

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      setIsPolling(false);
      clearInterval(pollInterval);
    }, 300000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isPolling, initialProject.id, revalidator]);

  if (isPolling || (initialProject.status === "parsing" && initialScenes.length === 0)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl">
          <Loader2 className="w-16 h-16 text-[#f5c518] mx-auto mb-6 animate-spin" />
          <h2 className="font-oswald text-3xl uppercase font-bold tracking-tight text-white mb-4">
            AI is Parsing Your Screenplay
          </h2>
          <p className="font-courier text-[#888] text-lg leading-relaxed mb-6">
            Our AI is analyzing your screenplay and extracting scene details including
            characters, props, visual mood, and audio requirements. This typically takes
            2-3 minutes with GPT-4.
          </p>
          <div className="bg-[#1c1c1f] border border-[#333] p-6 rounded mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Film className="text-[#00f2ea]" size={20} />
              <span className="font-oswald uppercase text-sm text-[#888] tracking-wider">
                Processing Status
              </span>
            </div>
            <p className="font-courier text-[#f5c518] text-sm">
              {initialProject.status === "parsing" ? "Parsing screenplay..." : "Almost ready..."}
            </p>
          </div>
          <button
            onClick={() => {
              console.log("🔄 Manual refresh triggered");
              revalidator.revalidate();
            }}
            className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider px-6 py-3 transition-colors"
          >
            Check if Ready
          </button>
          <p className="font-courier text-[#666] text-xs mt-4">
            Click the button above when your n8n workflow completes
          </p>
        </div>
      </div>
    );
  }

  if (initialScenes.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="w-16 h-16 text-[#333] mx-auto mb-4" />
        <p className="font-courier text-[#666] text-lg mb-4">
          No scenes found. The screenplay parsing may have failed.
        </p>
        <button
          onClick={() => revalidator.revalidate()}
          className="font-oswald uppercase text-sm text-[#f5c518] hover:text-white transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return null;
}
