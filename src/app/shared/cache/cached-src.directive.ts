import {
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
  output,
  Renderer2,
} from '@angular/core';
import { ImageCacheService } from './image-cache.service';

/** 1x1 transparent GIF - holds the layout box without a broken-image icon. */
const TRANSPARENT_PX =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Drop-in replacement for `[src]` on a remote image, served from the on-disk
 * image cache.
 *
 * Falls back to the original URL if anything goes wrong, so a cache failure
 * degrades to exactly today's behaviour rather than a blank frame.
 */
@Directive({
  selector: 'img[appCachedSrc]',
  standalone: true,
})
export class CachedSrcDirective {
  readonly appCachedSrc = input<string | null | undefined>();
  readonly cachedSrcPlaceholder = input<string>(TRANSPARENT_PX);
  readonly cachedSrcError = output<void>();

  private readonly cache = inject(ImageCacheService);
  private readonly element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  /**
   * Guards against an out-of-order resolution painting into a recycled node.
   * `*cdkVirtualFor` reuses embedded views and reassigns the bound item, so the
   * input changes rather than the directive being destroyed - without this, a
   * slow fetch for row 3 lands in the node now showing row 40.
   */
  private requestId = 0;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
    effect(() => this.apply(this.appCachedSrc()));
  }

  private apply(url: string | null | undefined): void {
    const id = ++this.requestId;

    if (!url) {
      this.setSrc(this.cachedSrcPlaceholder());
      return;
    }

    // A memory hit is applied in the same tick, so a return visit never flashes
    // the placeholder before the real image.
    const hit = this.cache.peek(url);
    if (hit) {
      this.setSrc(hit);
      return;
    }

    this.setSrc(this.cachedSrcPlaceholder());
    this.cache.resolve(url).then(
      (src) => this.applyIfCurrent(id, src),
      () => {
        if (this.applyIfCurrent(id, url)) {
          this.cachedSrcError.emit();
        }
      },
    );
  }

  private applyIfCurrent(id: number, src: string): boolean {
    if (this.destroyed || id !== this.requestId) {
      return false;
    }
    this.setSrc(src);
    return true;
  }

  private setSrc(src: string): void {
    this.renderer.setAttribute(this.element.nativeElement, 'src', src);
  }
}
