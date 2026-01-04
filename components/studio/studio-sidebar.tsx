"use client";

import { Link, useLocation } from "react-router";
import { BookOpen, Film, Image as ImageIcon, Video, Clock, Download, Settings } from "lucide-react";

interface StudioSidebarProps {
  projectId: string;
}

export function StudioSidebar({ projectId }: StudioSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const tabs = [
    {
      name: "Bible",
      href: `/projects/${projectId}/studio/bible`,
      icon: BookOpen,
      description: "Character & location review"
    },
    {
      name: "Scenes",
      href: `/projects/${projectId}/studio/scenes`,
      icon: Film,
      description: "Scene validation & approval"
    },
    {
      name: "Images",
      href: `/projects/${projectId}/studio/images`,
      icon: ImageIcon,
      description: "Two-phase image generation"
    },
    {
      name: "Video",
      href: `/projects/${projectId}/studio/video`,
      icon: Video,
      description: "Video generation"
    },
    {
      name: "Timeline",
      href: `/projects/${projectId}/studio/timeline`,
      icon: Clock,
      description: "Sequence & preview"
    },
    {
      name: "Export",
      href: `/projects/${projectId}/studio/export`,
      icon: Download,
      description: "Final render & download"
    }
  ];

  // Settings link (global, not project-specific)
  const settingsLink = {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "API keys & configuration"
  };

  const isActive = (href: string) => {
    if (href === `/projects/${projectId}/studio`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-[#333] bg-[#0a0a0b] min-h-[calc(100vh-140px)] flex flex-col">
      <div className="p-6 flex-1">
        <h2 className="font-oswald text-lg uppercase text-[#f5c518] mb-4 tracking-wider">
          Production Studio
        </h2>

        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);

            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`
                  block p-3 rounded transition-colors
                  ${active
                    ? "bg-[#f5c518] text-black"
                    : "text-[#888] hover:bg-[#1c1c1f] hover:text-white"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <div className={`font-oswald uppercase text-sm ${active ? "text-black" : ""}`}>
                      {tab.name}
                    </div>
                    <div className={`font-courier text-xs ${active ? "text-black/70" : "text-[#666]"}`}>
                      {tab.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings link at bottom (global, not project-specific) */}
      <div className="p-6 border-t border-[#333]">
        <Link
          to={settingsLink.href}
          className="block p-3 rounded transition-colors text-[#888] hover:bg-[#1c1c1f] hover:text-white"
        >
          <div className="flex items-center gap-3">
            <settingsLink.icon size={18} />
            <div>
              <div className="font-oswald uppercase text-sm">
                {settingsLink.name}
              </div>
              <div className="font-courier text-xs text-[#666]">
                {settingsLink.description}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
