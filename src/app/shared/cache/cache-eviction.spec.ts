import { CacheEntry } from './cache-entry';
import { selectEvictions, selectExpired } from './cache-eviction';

function entry(key: string, size: number, lastAccessAt: number): CacheEntry {
  return {
    key,
    kind: 'img',
    file: key,
    scope: 'shared',
    size,
    fetchedAt: lastAccessAt,
    lastAccessAt,
  };
}

describe('selectEvictions', () => {
  it('evicts nothing while under budget', () => {
    const entries = [entry('a', 10, 1), entry('b', 10, 2)];
    expect(selectEvictions(entries, 100, 80)).toEqual([]);
  });

  it('evicts nothing when exactly at budget', () => {
    const entries = [entry('a', 50, 1), entry('b', 50, 2)];
    expect(selectEvictions(entries, 100, 80)).toEqual([]);
  });

  it('evicts least-recently-accessed first, down to the target', () => {
    const entries = [
      entry('old', 40, 1),
      entry('mid', 40, 2),
      entry('new', 40, 3),
    ];
    // 120 total, budget 100, target 80 -> drop one 40-byte entry.
    expect(selectEvictions(entries, 100, 80)).toEqual(['old']);
  });

  it('keeps evicting until the target is met, not just the budget', () => {
    const entries = [
      entry('a', 30, 1),
      entry('b', 30, 2),
      entry('c', 30, 3),
      entry('d', 30, 4),
    ];
    // 120 total, budget 100, target 60 -> must drop two.
    expect(selectEvictions(entries, 100, 60)).toEqual(['a', 'b']);
  });

  it('breaks ties deterministically when access times match', () => {
    const a = entry('a', 60, 5);
    const b = entry('b', 60, 5);
    a.fetchedAt = 1;
    b.fetchedAt = 2;
    expect(selectEvictions([b, a], 100, 80)).toEqual(['a']);
  });

  it('does not mutate the input', () => {
    const entries = [entry('b', 60, 2), entry('a', 60, 1)];
    selectEvictions(entries, 100, 80);
    expect(entries.map((e) => e.key)).toEqual(['b', 'a']);
  });
});

describe('selectExpired', () => {
  it('returns only entries past the age cap', () => {
    const now = 10_000;
    const entries = [entry('fresh', 1, 0), entry('stale', 1, 0)];
    entries[0].fetchedAt = now - 100;
    entries[1].fetchedAt = now - 5_000;
    expect(selectExpired(entries, 1_000, now)).toEqual(['stale']);
  });
});
