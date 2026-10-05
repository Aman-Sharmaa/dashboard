/**
 * lib/cron-cache.ts
 *
 * Simple in-process TTL cache for cron job data.
 * Because Vercel serverless functions may share a warm instance
 * across many invocations, this avoids redundant DB reads.
 *
 * Default TTL: 5 hours (18,000,000 ms).
 */

const DEFAULT_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}

/**
 * Get-or-fetch helper.
 * Returns cached value if fresh; otherwise calls `fetcher`, caches, and returns.
 */
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  cacheSet(key, value, ttlMs);
  return value;
}
