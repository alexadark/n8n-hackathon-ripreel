import { Link } from "react-router";
import { Play, Database, Workflow, Film, Settings } from "lucide-react";
import { IntroBox } from "@/components/landing/IntroBox";
import { StickyNote } from "@/components/landing/StickyNote";
import { ClapperCard } from "@/components/landing/ClapperCard";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "RipReel - Turn Your Screenplay Into A Rip Reel" },
    {
      name: "description",
      content:
        "AI-powered film production tool that helps filmmakers create professional video pitch reels in under 1 hour. Powered by AI and n8n.",
    },
  ];
}

const features = [
  {
    icon: Database,
    title: "Parallel Extraction",
    description: "Parsing via Text-to-Workflow.",
  },
  {
    icon: Workflow,
    title: "n8n Orchestration",
    description: "Connecting 5+ AI Models via API.",
  },
  {
    icon: Film,
    title: "Hybrid Engine",
    description: "Video & Static Image blending.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white pb-10">
      {/* Header */}
      <header className="pt-8 pb-12 mb-12 border-b border-[#333]">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="text-[#888] hover:text-[#f5c518] transition-colors"
              title="Settings"
            >
              <Settings size={22} />
            </Link>
            <Link
              to="/projects"
              className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider px-6 py-2 font-bold transition-colors rounded-sm"
            >
              Enter Studio
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-24 flex flex-col items-center">
          <h1 className="font-oswald text-4xl sm:text-5xl md:text-7xl lg:text-8xl uppercase font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-[#666]">
            Turn Your Screenplay
            <br />
            Into A Rip Reel
          </h1>
          <p className="font-courier text-[#f5c518] text-lg md:text-xl tracking-widest mb-10">
            IN UNDER 1 HOUR. POWERED BY AI & N8N.
          </p>

          {/* Draft Box */}
          <IntroBox />

          <Link
            to="/projects/new"
            className="inline-flex items-center gap-3 bg-[#e02f2f] hover:bg-red-600 text-white font-oswald text-xl uppercase tracking-widest px-8 py-4 mt-8 transition-all hover:scale-105 shadow-2xl shadow-red-900/50 rounded-sm"
          >
            <Play fill="currentColor" size={20} />
            Start Your Rip Reel
          </Link>
        </div>

        {/* Sticky Note */}
        <StickyNote />

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, i) => (
            <ClapperCard key={i} {...feature} />
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8 text-center text-[#888] font-courier text-xs">
          <div>© 2025 RIPREEL.IO // ALL RIGHTS RESERVED</div>
        </footer>
      </div>
    </div>
  );
}
