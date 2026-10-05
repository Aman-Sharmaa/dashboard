/**
 * Lightweight in-memory cache for cron/background jobs.
 * Avoids repeated DB round-trips within a single cron run (e.g. project lists,
 * company profiles). Entries are automatically expired by TTL.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Return the cached value for `key` if still fresh, otherwise call `fetcher`,
 * store the result with the given TTL (ms), and return it.
 */
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T> | T,
  ttlMs: number
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fetcher();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Immediately invalidate a cache entry so the next `cacheGetOrFetch` call
 * triggers a fresh fetch.
 */
export function cacheDel(key: string): void {
  cache.delete(key);
}

/**
 * Remove all expired entries from the cache map.
 */
export function cachePurgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache. Useful in tests or forced-refresh scenarios.
 */
export function cacheClear(): void {
  cache.clear();
}
