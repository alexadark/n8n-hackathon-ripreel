import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Supabase Storage Image Transformation options
 */
export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

/**
 * Transform a Supabase Storage URL to use image transformations.
 * Converts /object/ URLs to /render/image/ URLs with transformation params.
 *
 * @param url - Original Supabase Storage URL or any image URL
 * @param options - Transformation options (width, height, quality, resize)
 * @returns Transformed URL with query params, or original URL if not a Supabase Storage URL
 *
 * @example
 * // Original: https://xxx.supabase.co/storage/v1/object/public/bucket/image.jpg
 * // Returns:  https://xxx.supabase.co/storage/v1/render/image/public/bucket/image.jpg?width=200&height=200
 * optimizeImageUrl(url, { width: 200, height: 200 })
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions
): string {
  if (!url) return "";

  // Check if this is a Supabase Storage URL
  const isSupabaseStorage =
    url.includes("supabase.co/storage/v1/") ||
    url.includes("supabase.in/storage/v1/");

  if (!isSupabaseStorage) {
    // For non-Supabase URLs, return as-is (no transformation available)
    return url;
  }

  // Convert /object/ to /render/image/ for transformation
  let transformedUrl = url.replace(
    "/storage/v1/object/",
    "/storage/v1/render/image/"
  );

  // Also handle signed URLs which use /object/sign/
  transformedUrl = transformedUrl.replace(
    "/storage/v1/object/sign/",
    "/storage/v1/render/image/sign/"
  );

  // Build query params
  const params = new URLSearchParams();

  if (options.width) {
    params.set("width", String(Math.min(options.width, 2500)));
  }
  if (options.height) {
    params.set("height", String(Math.min(options.height, 2500)));
  }
  if (options.quality) {
    params.set("quality", String(Math.max(20, Math.min(options.quality, 100))));
  }
  if (options.resize) {
    params.set("resize", options.resize);
  }

  // Append params to URL
  const separator = transformedUrl.includes("?") ? "&" : "?";
  return `${transformedUrl}${separator}${params.toString()}`;
}

/**
 * Predefined image sizes for common use cases.
 * Uses 2x resolution for retina displays.
 */
export const IMAGE_SIZES = {
  // Tiny thumbnails (icons, avatars)
  thumbnail: { width: 80, height: 80, quality: 75 },
  thumbnailSmall: { width: 40, height: 40, quality: 75 },

  // Small previews
  previewSmall: { width: 200, height: 200, quality: 80 },

  // Medium card images
  cardMedium: { width: 400, height: 300, quality: 80 },
  cardSquare: { width: 400, height: 400, quality: 80 },

  // Large previews
  previewLarge: { width: 800, height: 600, quality: 85 },

  // Full-size modal/lightbox (still optimized)
  modal: { width: 1200, height: 900, quality: 90 },

  // Video thumbnails (16:9)
  videoThumb: { width: 320, height: 180, quality: 80 },
  videoLarge: { width: 640, height: 360, quality: 85 },
} as const;
