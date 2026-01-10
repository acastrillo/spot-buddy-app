/**
 * Cache Utilities
 * Helpers for managing localStorage cache with timestamps and TTL
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number; // Unix timestamp in milliseconds
  version?: string; // Optional version for schema changes
}

/**
 * Get item from cache with TTL check
 * @param key - localStorage key
 * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
 * @returns Cached data if fresh, null if stale or missing
 */
export function getCachedItem<T>(
  key: string,
  ttlMs: number = 60 * 60 * 1000 // 1 hour default
): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Check if cache is stale
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > ttlMs) {
      // Cache is stale, remove it
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set item in cache with timestamp
 * @param key - localStorage key
 * @param data - Data to cache
 * @param version - Optional version string for schema tracking
 */
export function setCachedItem<T>(
  key: string,
  data: T,
  version?: string
): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version,
    };

    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`Error writing cache for ${key}:`, error);
  }
}

/**
 * Check if cache is stale without retrieving data
 * @param key - localStorage key
 * @param ttlMs - Time-to-live in milliseconds
 * @returns true if cache exists and is fresh, false otherwise
 */
export function isCacheFresh(
  key: string,
  ttlMs: number = 60 * 60 * 1000
): boolean {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;

    const entry: CacheEntry<any> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;

    return age <= ttlMs;
  } catch {
    return false;
  }
}

/**
 * Invalidate (remove) cache entry
 * @param key - localStorage key
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error invalidating cache for ${key}:`, error);
  }
}

/**
 * Invalidate all cache entries matching a pattern
 * @param pattern - RegExp pattern to match keys
 */
export function invalidateCachePattern(pattern: RegExp): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (pattern.test(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error invalidating cache pattern:', error);
  }
}

/**
 * Get cache age in milliseconds
 * @param key - localStorage key
 * @returns Age in milliseconds, or null if cache doesn't exist
 */
export function getCacheAge(key: string): number | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<any> = JSON.parse(cached);
    const now = Date.now();
    return now - entry.timestamp;
  } catch {
    return null;
  }
}

// Common TTL values (in milliseconds)
export const TTL = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
