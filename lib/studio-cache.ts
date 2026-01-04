/**
 * Simple client-side cache for studio route data
 * This mimics Next.js's automatic route caching behavior
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// Cache TTL in milliseconds (30 seconds - short enough to stay fresh, long enough to feel instant)
const CACHE_TTL = 30_000;

// In-memory cache store
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached data for a route
 */
export function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set cached data for a route
 */
export function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache for a specific key or pattern
 */
export function invalidateCache(keyOrPattern?: string | RegExp): void {
  if (!keyOrPattern) {
    cache.clear();
    return;
  }

  if (typeof keyOrPattern === 'string') {
    cache.delete(keyOrPattern);
  } else {
    for (const key of cache.keys()) {
      if (keyOrPattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Generate a cache key for studio routes
 */
export function getStudioCacheKey(projectId: string, tab: string): string {
  return `studio:${projectId}:${tab}`;
}
