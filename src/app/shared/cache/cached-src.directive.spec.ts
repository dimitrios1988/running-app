import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CachedSrcDirective } from './cached-src.directive';
import { ImageCacheService } from './image-cache.service';

/** Lets each URL's resolution be settled by hand, in any order. */
class ControllableImageCache {
  readonly memory = new Map<string, string>();
  private readonly deferred = new Map<
    string,
    { resolve: (v: string) => void; reject: (e: unknown) => void }
  >();

  peek(url: string | null | undefined): string | null {
    return url ? (this.memory.get(url) ?? null) : null;
  }

  resolve(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.deferred.set(url, { resolve, reject });
    });
  }

  settle(url: string, src: string): void {
    this.deferred.get(url)?.resolve(src);
  }

  fail(url: string): void {
    this.deferred.get(url)?.reject(new Error('nope'));
  }
}

@Component({
  standalone: true,
  imports: [CachedSrcDirective],
  template: `<img [appCachedSrc]="url()" (cachedSrcError)="errors = errors + 1" />`,
})
class HostComponent {
  readonly url = signal<string | null>('https://cms/a.png');
  errors = 0;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CachedSrcDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let cache: ControllableImageCache;

  beforeEach(() => {
    cache = new ControllableImageCache();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ImageCacheService, useValue: cache }],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const img = (): HTMLImageElement =>
    fixture.nativeElement.querySelector('img');

  it('paints a memory hit without going through the placeholder', () => {
    cache.memory.set('https://cms/a.png', 'blob:cached-a');
    fixture.detectChanges();

    expect(img().getAttribute('src')).toBe('blob:cached-a');
  });

  it('shows the placeholder until the resolution lands', async () => {
    fixture.detectChanges();
    expect(img().getAttribute('src')).toContain('data:image/gif');

    cache.settle('https://cms/a.png', 'blob:a');
    await settle();

    expect(img().getAttribute('src')).toBe('blob:a');
  });

  it('ignores a stale resolution after the input changed', async () => {
    // The virtual-scroll recycling case: the bound item is swapped while the
    // first fetch is still in flight.
    fixture.detectChanges();
    host.url.set('https://cms/b.png');
    fixture.detectChanges();

    // The slow first request lands last and must not paint.
    cache.settle('https://cms/b.png', 'blob:b');
    await settle();
    cache.settle('https://cms/a.png', 'blob:a');
    await settle();

    expect(img().getAttribute('src')).toBe('blob:b');
  });

  it('falls back to the remote url and reports when resolution fails', async () => {
    fixture.detectChanges();
    cache.fail('https://cms/a.png');
    await settle();

    expect(img().getAttribute('src')).toBe('https://cms/a.png');
    expect(host.errors).toBe(1);
  });

  it('shows the placeholder for a null url', () => {
    host.url.set(null);
    fixture.detectChanges();

    expect(img().getAttribute('src')).toContain('data:image/gif');
  });
});
