import SHA256 from "crypto-js/sha256";

/**
 * In-memory LRU cache with TTL support
 * Optional Redis upgrade path via REDIS_URL env var
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const MAX_ENTRIES = 100;
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Generate a fingerprint for a syllabus + academic level + depth combination
 */
export function generateFingerprint(
  syllabus: string,
  level: string,
  depth: string
): string {
  const normalized = syllabus
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const input = `${normalized}|${level}|${depth}`;
  return SHA256(input).toString();
}

/**
 * Get a cached value by key
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  // Move to end (most recently used)
  cache.delete(key);
  cache.set(key, entry);

  return entry.data;
}

/**
 * Set a cached value
 */
export function setCached<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_ENTRIES };
}
