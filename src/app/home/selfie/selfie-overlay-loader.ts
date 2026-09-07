import { Injectable, OnDestroy, inject } from '@angular/core';
import { ImageCacheService } from '../../shared/cache/image-cache.service';

export interface LoadedOverlayImage {
  /** Decoded and ready for `drawImage` - no further await needed. */
  image: HTMLImageElement;
  /** Safe to bind to `[src]` in a template. */
  displayUrl: string;
  width: number;
  height: number;
}

const HTTP_URL = /^https?:/i;

/**
 * Loads overlay artwork in a form the capture canvas can use.
 *
 * The important part is that remote artwork is fetched as a blob and handed to
 * the <img> as an object URL. A `blob:` URL is same-origin, so `drawImage` never
 * taints the canvas - whereas pointing an <img> straight at
 * `https://.../data/download/...` would taint it and make `toBlob()` throw
 * `SecurityError` at capture time. Local `assets/` art is already same-origin and
 * skips the fetch entirely.
 *
 * Provided at component level, so Angular destroys it with the camera modal and
 * `ngOnDestroy` can revoke every object URL it handed out.
 */
@Injectable()
export class SelfieOverlayLoader implements OnDestroy {
  // The shared image cache owns the fetch (including the HttpBackend trick that
  // avoids a CORS preflight) and the disk tier, so reopening the camera does not
  // re-download the artwork. What stays here is the part it must not do: force a
  // `blob:` URL, which is the only source guaranteed not to taint the canvas.
  private readonly imageCache = inject(ImageCacheService);

  /** Decoded images for this modal - the shared cache stores bytes, not
   * decoded HTMLImageElements. */
  private readonly cache = new Map<string, Promise<LoadedOverlayImage>>();
  private readonly objectUrls: string[] = [];
  private destroyed = false;

  /** Resolves once the artwork is fetched and fully decoded. */
  load(url: string): Promise<LoadedOverlayImage> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    const pending = this.resolve(url).catch((error) => {
      // Do not cache failures - a retry on the next open should be able to work.
      this.cache.delete(url);
      throw error;
    });
    this.cache.set(url, pending);
    return pending;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    // Revoked only here, never on selection change: the option squares stay
    // mounted for the whole modal, and revoking early would blank them out.
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.length = 0;
    this.cache.clear();
  }

  private async resolve(url: string): Promise<LoadedOverlayImage> {
    let displayUrl = url;

    if (HTTP_URL.test(url)) {
      const blob = await this.imageCache.loadBlob(url);
      displayUrl = URL.createObjectURL(blob);

      if (this.destroyed) {
        // The modal closed mid-flight; nothing will ever revoke this otherwise.
        URL.revokeObjectURL(displayUrl);
        throw new Error('Overlay loader destroyed');
      }
      this.objectUrls.push(displayUrl);
    }

    const image = await decodeImage(displayUrl);
    return {
      image,
      displayUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  // No-op for blob: and relative URLs, but lets a properly CORS-configured host
  // be used directly without tainting, should one ever be pointed at.
  if (HTTP_URL.test(src)) {
    image.crossOrigin = 'anonymous';
  }
  image.src = src;

  return image
    .decode()
    .catch(() => waitForLoad(image))
    .then(() => {
      if (!image.naturalWidth || !image.naturalHeight) {
        // An SVG with no intrinsic size decodes fine but cannot be drawn to a
        // sensible rectangle, so treat it as a failure rather than a blank frame.
        throw new Error(`Overlay image has no intrinsic size: ${src}`);
      }
      return image;
    });
}

/** `decode()` is not implemented everywhere; fall back to the load event. */
function waitForLoad(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error(`Failed to load overlay image: ${image.src}`));
  });
}
