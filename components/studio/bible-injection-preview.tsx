'use client';

import { User, MapPin, Package } from 'lucide-react';
import type { BibleInjectionData } from '@/app/actions/types';
import { optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

interface BibleInjectionPreviewProps {
  data: BibleInjectionData;
  compact?: boolean;
}

/**
 * Shows what Bible elements will be injected into scene image generation
 */
export function BibleInjectionPreview({
  data,
  compact = false,
}: BibleInjectionPreviewProps) {
  const hasCharacters = data.characters.length > 0;
  const hasLocation = data.location !== null;
  const hasProps = data.props.length > 0;
  const hasAnyElements = hasCharacters || hasLocation || hasProps;

  if (!hasAnyElements) {
    return (
      <div className="text-[#666] font-courier text-xs italic">
        No Bible elements found for this scene
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {/* Characters */}
        {data.characters.map((char) => (
          <div
            key={char.id}
            className="flex items-center gap-1.5 bg-[#1c1c1f] border border-[#333] px-2 py-1 rounded"
          >
            {char.portrait_url ? (
              <img
                src={optimizeImageUrl(char.portrait_url, IMAGE_SIZES.thumbnailSmall)}
                alt={char.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User size={14} className="text-[#f5c518]" />
            )}
            <span className="text-white font-courier text-xs">{char.name}</span>
          </div>
        ))}

        {/* Location */}
        {data.location && (
          <div className="flex items-center gap-1.5 bg-[#1c1c1f] border border-[#333] px-2 py-1 rounded">
            {data.location.image_url ? (
              <img
                src={optimizeImageUrl(data.location.image_url, IMAGE_SIZES.thumbnailSmall)}
                alt={data.location.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <MapPin size={14} className="text-[#00f2ea]" />
            )}
            <span className="text-white font-courier text-xs">
              {data.location.name}
            </span>
          </div>
        )}

        {/* Props */}
        {data.props.map((prop) => (
          <div
            key={prop.id}
            className="flex items-center gap-1.5 bg-[#1c1c1f] border border-[#333] px-2 py-1 rounded"
          >
            {prop.image_url ? (
              <img
                src={optimizeImageUrl(prop.image_url, IMAGE_SIZES.thumbnailSmall)}
                alt={prop.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <Package size={14} className="text-[#888]" />
            )}
            <span className="text-white font-courier text-xs">{prop.name}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-oswald uppercase text-[#888] text-xs tracking-wider">
        Bible Elements to Inject
      </h4>

      {/* Characters */}
      {hasCharacters && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#f5c518]">
            <User size={12} />
            <span className="font-courier text-xs uppercase">Characters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.characters.map((char) => (
              <div
                key={char.id}
                className="flex items-center gap-2 bg-[#0a0a0b] border border-[#333] px-2 py-1.5 rounded"
              >
                {char.portrait_url ? (
                  <img
                    src={optimizeImageUrl(char.portrait_url, IMAGE_SIZES.thumbnailSmall)}
                    alt={char.name}
                    className="w-6 h-6 rounded-full object-cover border border-[#f5c518]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1c1c1f] flex items-center justify-center">
                    <User size={12} className="text-[#666]" />
                  </div>
                )}
                <span className="text-white font-courier text-xs">
                  {char.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {hasLocation && data.location && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#00f2ea]">
            <MapPin size={12} />
            <span className="font-courier text-xs uppercase">Location</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0a0a0b] border border-[#333] px-2 py-1.5 rounded w-fit">
            {data.location.image_url ? (
              <img
                src={optimizeImageUrl(data.location.image_url, IMAGE_SIZES.thumbnailSmall)}
                alt={data.location.name}
                className="w-8 h-6 rounded object-cover border border-[#00f2ea]"
              />
            ) : (
              <div className="w-8 h-6 rounded bg-[#1c1c1f] flex items-center justify-center">
                <MapPin size={12} className="text-[#666]" />
              </div>
            )}
            <span className="text-white font-courier text-xs">
              {data.location.name}
            </span>
          </div>
        </div>
      )}

      {/* Props */}
      {hasProps && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#888]">
            <Package size={12} />
            <span className="font-courier text-xs uppercase">Props</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.props.map((prop) => (
              <div
                key={prop.id}
                className="flex items-center gap-2 bg-[#0a0a0b] border border-[#333] px-2 py-1.5 rounded"
              >
                {prop.image_url ? (
                  <img
                    src={optimizeImageUrl(prop.image_url, IMAGE_SIZES.thumbnailSmall)}
                    alt={prop.name}
                    className="w-6 h-6 rounded object-cover border border-[#555]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-[#1c1c1f] flex items-center justify-center">
                    <Package size={12} className="text-[#666]" />
                  </div>
                )}
                <span className="text-white font-courier text-xs">
                  {prop.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
