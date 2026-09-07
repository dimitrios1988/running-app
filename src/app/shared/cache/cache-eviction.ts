import { CacheEntry } from './cache-entry';

/**
 * Least-recently-used selection, kept pure so it can be tested without touching
 * the filesystem.
 *
 * Returns the keys to drop so that the remaining total is at or below
 * `targetBytes`. Evicting to a target below the budget rather than to the budget
 * itself gives hysteresis: without it, every write once full would trigger a
 * sweep.
 */
export function selectEvictions(
  entries: CacheEntry[],
  budgetBytes: number,
  targetBytes: number,
): string[] {
  let total = 0;
  for (const entry of entries) {
    total += entry.size;
  }
  if (total <= budgetBytes) {
    return [];
  }

  // Oldest access first. `fetchedAt` breaks ties so the order is deterministic
  // for entries touched within the same millisecond - which is the common case
  // when a page paints and reads a dozen images at once.
  const byAge = [...entries].sort(
    (a, b) => a.lastAccessAt - b.lastAccessAt || a.fetchedAt - b.fetchedAt,
  );

  const evicted: string[] = [];
  for (const entry of byAge) {
    if (total <= targetBytes) {
      break;
    }
    evicted.push(entry.key);
    total -= entry.size;
  }
  return evicted;
}

/** Keys whose entries are older than the kind's absolute age cap. */
export function selectExpired(
  entries: CacheEntry[],
  maxAgeMs: number,
  now: number,
): string[] {
  return entries
    .filter((entry) => now - entry.fetchedAt > maxAgeMs)
    .map((entry) => entry.key);
}
