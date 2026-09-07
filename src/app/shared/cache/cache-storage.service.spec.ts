import { TestBed } from '@angular/core/testing';
import { CacheStorageService } from './cache-storage.service';

/**
 * Runs against the real `@capacitor/filesystem` web shim (IndexedDB-backed), so
 * it covers the write -> rename -> read round trip rather than a mock of it.
 * The native path cannot be exercised here; it needs a device.
 */
describe('CacheStorageService (web filesystem)', () => {
  let storage: CacheStorageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    storage = TestBed.inject(CacheStorageService);
    await storage.ready;
    await storage.clearAll();
  });

  it('round-trips a JSON body', async () => {
    await storage.writeJson('k1', { a: 1, nested: [1, 2] }, 'shared');

    const read = await storage.readJson('k1');
    expect(read?.body).toEqual({ a: 1, nested: [1, 2] });
    expect(read?.fetchedAt).toBeGreaterThan(0);
  });

  it('misses on an unknown key', async () => {
    expect(await storage.readJson('never-written')).toBeNull();
  });

  it('overwrites an existing entry rather than accumulating', async () => {
    await storage.writeJson('k1', { v: 1 }, 'shared');
    await storage.writeJson('k1', { v: 2 }, 'shared');

    expect((await storage.readJson('k1'))?.body).toEqual({ v: 2 });
  });

  it('round-trips a blob and reports its content type', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: 'image/png',
    });
    await storage.writeBlob('img1', blob);

    const read = await storage.readBlob('img1');
    expect(read).not.toBeNull();
    expect(read!.size).toBe(4);
    expect(read!.type).toBe('image/png');
    expect(new Uint8Array(await read!.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it('hands back a bindable, revocable source on web', async () => {
    await storage.writeBlob('img1', new Blob(['x'], { type: 'image/png' }));

    const source = await storage.readBlobSource('img1');
    expect(source).not.toBeNull();
    expect(source!.src.startsWith('blob:')).toBeTrue();
    // Web mints an object URL, so the caller owns its lifetime.
    expect(source!.revocable).toBeTrue();
    URL.revokeObjectURL(source!.src);
  });

  it('does not confuse the two tiers', async () => {
    await storage.writeJson('same-key', { a: 1 }, 'shared');
    expect(await storage.readBlob('same-key')).toBeNull();

    await storage.clearAll();
    await storage.writeBlob('same-key', new Blob(['x']));
    expect(await storage.readJson('same-key')).toBeNull();
  });

  it('drops user-scoped entries and keeps shared ones', async () => {
    await storage.writeJson('shared-1', { a: 1 }, 'shared');
    await storage.writeJson('user-1', { a: 2 }, 'user');
    await storage.writeBlob('img-1', new Blob(['x'], { type: 'image/png' }));

    await storage.removeWhere((entry) => entry.scope === 'user');

    expect(await storage.readJson('user-1')).toBeNull();
    expect((await storage.readJson('shared-1'))?.body).toEqual({ a: 1 });
    // Images are shared CMS assets; a logout must not evict them.
    expect(await storage.readBlob('img-1')).not.toBeNull();
  });

  it('clears everything', async () => {
    await storage.writeJson('k1', { a: 1 }, 'shared');
    await storage.writeBlob('img1', new Blob(['x']));

    await storage.clearAll();

    expect(await storage.readJson('k1')).toBeNull();
    expect(await storage.readBlob('img1')).toBeNull();
  });

  it('survives concurrent writes to different keys', async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        storage.writeJson(`k${i}`, { i }, 'shared'),
      ),
    );

    for (let i = 0; i < 12; i++) {
      expect((await storage.readJson(`k${i}`))?.body).toEqual({ i });
    }
  });
});
