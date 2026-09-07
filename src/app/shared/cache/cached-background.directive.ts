import {
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { ImageCacheService } from './image-cache.service';

/**
 * The `background-image` counterpart of CachedSrcDirective, for the one place a
 * remote image is painted through CSS rather than an <img> (the news list card).
 */
@Directive({
  selector: '[appCachedBackground]',
  standalone: true,
})
export class CachedBackgroundDirective {
  readonly appCachedBackground = input<string | null | undefined>();

  private readonly cache = inject(ImageCacheService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  /** See CachedSrcDirective - the news list is virtual-scrolled and recycles. */
  private requestId = 0;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
    effect(() => this.apply(this.appCachedBackground()));
  }

  private apply(url: string | null | undefined): void {
    const id = ++this.requestId;

    if (!url) {
      this.setBackground(null);
      return;
    }

    const hit = this.cache.peek(url);
    if (hit) {
      this.setBackground(hit);
      return;
    }

    this.setBackground(null);
    this.cache.resolve(url).then(
      (src) => this.applyIfCurrent(id, src),
      // Degrade to the remote URL rather than an empty card.
      () => this.applyIfCurrent(id, url),
    );
  }

  private applyIfCurrent(id: number, src: string): void {
    if (this.destroyed || id !== this.requestId) {
      return;
    }
    this.setBackground(src);
  }

  private setBackground(src: string | null): void {
    this.renderer.setStyle(
      this.element.nativeElement,
      'background-image',
      src ? cssUrl(src) : 'none',
    );
  }
}

/**
 * Quoted and escaped. A `_capacitor_file_` path can contain characters that
 * would break an unquoted `url()` - the template this replaces concatenated the
 * URL in raw, which was a latent bug.
 */
function cssUrl(src: string): string {
  return `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}
