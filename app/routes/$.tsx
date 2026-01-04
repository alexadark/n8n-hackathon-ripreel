import { Link } from "react-router";
import { Home, Film, ArrowLeft } from "lucide-react";
import type { Route } from "./+types/$";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Page Not Found - RipReel" },
    { name: "description", content: "The page you are looking for does not exist." },
  ];
}

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link
            to="/"
            className="text-[#888] hover:text-[#f5c518] transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* 404 Display */}
          <div className="mb-8">
            <div className="font-oswald text-8xl md:text-9xl font-bold text-[#f5c518] mb-4">
              404
            </div>
            <h1 className="font-oswald text-3xl md:text-4xl uppercase tracking-wide mb-4">
              Scene Not Found
            </h1>
            <p className="font-courier text-[#888] text-lg">
              The page you are looking for does not exist or has been moved to
              another location.
            </p>
          </div>

          {/* Film Clapboard Visual */}
          <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-8 mb-8">
            <div className="border-t-4 border-[#f5c518] -mt-8 mb-6" />
            <div className="flex items-center justify-center gap-4 mb-4">
              <Film className="text-[#f5c518]" size={48} />
            </div>
            <div className="font-courier text-sm text-[#666] space-y-1">
              <p>SCENE: 404</p>
              <p>TAKE: 1</p>
              <p>STATUS: MISSING</p>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-widest px-6 py-3 transition-colors rounded-lg"
            >
              <Home size={18} />
              Return Home
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center gap-2 bg-[#1c1c1f] border border-[#333] hover:border-[#f5c518] text-white font-oswald uppercase tracking-widest px-6 py-3 transition-colors rounded-lg"
            >
              <Film size={18} />
              View Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#333] py-6 text-center">
        <div className="font-courier text-xs text-[#666]">
          Lost? Contact support at{" "}
          <a
            href="mailto:support@ripreel.io"
            className="text-[#f5c518] hover:underline"
          >
            support@ripreel.io
          </a>
        </div>
      </footer>
    </div>
  );
}
