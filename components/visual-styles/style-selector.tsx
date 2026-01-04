"use client";

import { cn } from "@/lib/utils";
import type { VisualStyle } from "@/lib/drizzle/schema";

interface StyleSelectorProps {
  styles: VisualStyle[];
  selectedStyleId: string | null;
  onSelect: (styleId: string) => void;
  className?: string;
}

/**
 * StyleSelector - Displays system visual styles as selectable cards
 */
export function StyleSelector({
  styles,
  selectedStyleId,
  onSelect,
  className,
}: StyleSelectorProps) {
  // Filter to only show system styles in the main grid
  const systemStyles = styles.filter((style) => style.is_system);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {systemStyles.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(style.id)}
          className={cn(
            "p-4 border-2 transition-all text-left",
            selectedStyleId === style.id
              ? "border-[#f5c518] bg-[#f5c518]/10"
              : "border-[#333] hover:border-[#555]"
          )}
        >
          <h3 className="font-oswald uppercase text-sm mb-1 text-white">
            {style.name}
          </h3>
          <p className="font-courier text-xs text-[#888]">{style.description}</p>
        </button>
      ))}
    </div>
  );
}
