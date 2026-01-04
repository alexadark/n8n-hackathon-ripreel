import { Link } from "react-router";
import { Film } from "lucide-react";

export function EmptyState() {
  return (
    <div className="text-center py-20 px-4">
      {/* Icon */}
      <div className="mb-6">
        <Film className="w-24 h-24 text-[#333] mx-auto" />
      </div>

      {/* Message */}
      <h2 className="font-oswald text-3xl uppercase tracking-wider text-[#666] mb-3">
        No Projects Yet
      </h2>
      <p className="font-courier text-[#888] text-sm mb-8 max-w-md mx-auto">
        Create your first project to start generating professional pitch reels in under 1 hour.
      </p>

      {/* CTA */}
      <Link
        to="/projects/new"
        className="inline-flex items-center gap-3 bg-[#f5c518] hover:bg-white text-black font-oswald text-lg uppercase tracking-widest px-8 py-4 transition-all hover:scale-105"
      >
        Start Your First Rip Reel!
      </Link>
    </div>
  );
}
