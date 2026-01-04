import type { LucideIcon } from "lucide-react";

interface ClapperCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ClapperCard({
  icon: Icon,
  title,
  description,
}: ClapperCardProps) {
  return (
    <div className="bg-[#1c1c1f] p-8 relative group border-t-4 border-[#f5c518] hover:border-t-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <Icon className="text-[#f5c518] mb-4 w-10 h-10" />
      <h3 className="font-oswald text-2xl uppercase text-white mb-2 tracking-wide">
        {title}
      </h3>
      <p className="font-courier text-[#888] text-sm leading-relaxed">
        {description}
      </p>

      {/* Tech Tooltip */}
      <div className="absolute top-4 right-4">
        <div className="group/tooltip relative">
          <div className="text-[10px] border border-[#00f2ea] text-[#00f2ea] px-1 uppercase cursor-help font-courier">
            SYS
          </div>
          <div className="opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 ease-in-out absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[rgba(10,10,10,0.98)] backdrop-blur-[10px] border border-[#00f2ea] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.9)] pointer-events-none z-[9999]">
            <h4 className="text-[#00f2ea] font-oswald text-xs mb-2 border-b border-[#00f2ea]/30 pb-1 uppercase">
              SYSTEM CHECK
            </h4>
            <p className="text-[10px] font-courier text-gray-300">
              Module active. Latency: 12ms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
