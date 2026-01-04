import { Zap } from "lucide-react";

export function StickyNote() {
  return (
    <div className="relative max-w-xl mx-auto my-20 p-8 md:p-12 bg-[#f1c40f] text-black transform rotate-1 hover:rotate-0 transition-transform duration-300 shadow-[2px_2px_5px_rgba(0,0,0,0.4)] border-l-[5px] border-black/20 z-[5]">
      {/* Decorative tape effect - left side */}
      <div className="absolute w-[30px] h-[120%] bg-white/20 -top-[10%] -left-[15px] transform rotate-45" />

      {/* Decorative tape effect - right side */}
      <div className="absolute w-[30px] h-[120%] bg-white/20 -top-[10%] -right-[15px] transform rotate-45" />

      {/* Content */}
      <div className="relative z-10">
        <h4 className="font-bold font-courier border-b border-black/20 pb-2 mb-3 flex items-center gap-2">
          <Zap size={16} className="text-black" /> PRODUCTION MEMO
        </h4>
        <p className="font-courier text-sm mb-3 leading-relaxed">
          Old Way: 2 weeks, hired editor, stock footage costs.
          <br />
          <span className="font-bold">New Way:</span> Upload PDF. N8N Agents
          extract scenes. Generate visuals. Render.
        </p>
        <div className="mt-3 text-xs font-bold uppercase tracking-widest border border-black px-2 py-1 inline-block bg-white/30">
          EFFICIENCY: 10,000%
        </div>
      </div>
    </div>
  );
}
