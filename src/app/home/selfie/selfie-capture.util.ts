/**
 * Pure canvas helpers for the selfie camera. No Angular DI here on purpose - the
 * tricky parts (cover-crop math, mirroring) are the parts most worth unit testing,
 * and they stay trivially testable as long as this file imports nothing.
 */

export interface CoverCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * The source rectangle `object-fit: cover` would pick when painting a
 * `vw x vh` video into a `bw x bh` box.
 *
 * The captured canvas is then sized to that rectangle rather than to the box, so
 * the photo keeps the sensor's full resolution while still matching the preview's
 * aspect ratio exactly. Because the ratios match by construction, a normalised
 * overlay coordinate resolves to the same place in the preview (`% of the stage`)
 * and in the capture (`fraction * canvas.width`).
 */
export function computeCoverCrop(
  vw: number,
  vh: number,
  bw: number,
  bh: number,
): CoverCrop {
  // A video that has not produced a frame yet reports 0x0, and a collapsed
  // layout box reports 0 too. Either would make `scale` Infinity or NaN.
  if (vw <= 0 || vh <= 0 || bw <= 0 || bh <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(vw, 0), sh: Math.max(vh, 0) };
  }

  const scale = Math.max(bw / vw, bh / vh);
  // Clamp: rounding can push the crop a pixel past the frame, which makes
  // drawImage sample outside the source and edge-smear.
  const sw = Math.min(vw, Math.round(bw / scale));
  const sh = Math.min(vh, Math.round(bh / scale));

  return {
    sx: Math.round((vw - sw) / 2),
    sy: Math.round((vh - sh) / 2),
    sw,
    sh,
  };
}

export interface OverlayDrawSpec {
  image: CanvasImageSource;
  /** Artwork's own pixel dimensions, used when `height` is null. */
  intrinsicWidth: number;
  intrinsicHeight: number;
  /** All normalised 0..1 against the captured frame. */
  x: number;
  y: number;
  width: number;
  height: number | null;
  opacity: number | null;
}

export interface ComposeSelfieOptions {
  source: CanvasImageSource;
  /** The source's intrinsic size - `videoWidth`/`videoHeight` for a video. */
  sourceWidth: number;
  sourceHeight: number;
  /** The on-screen stage the user was actually looking at. */
  boxWidth: number;
  boxHeight: number;
  /** True for the front camera, matching the mirrored CSS preview. */
  mirror: boolean;
  overlay: OverlayDrawSpec | null;
}

/**
 * Draws the frame and (optionally) the overlay into a fresh canvas.
 *
 * The video is mirrored but the overlay never is - otherwise any text in the
 * artwork would come out backwards. A CSS `transform` on the <video> has no
 * effect on `drawImage`, so the mirror has to be re-applied here in JS.
 */
export function composeSelfie(options: ComposeSelfieOptions): HTMLCanvasElement {
  const { source, sourceWidth, sourceHeight, boxWidth, boxHeight, mirror } =
    options;

  const crop = computeCoverCrop(
    sourceWidth,
    sourceHeight,
    boxWidth,
    boxHeight,
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, crop.sw);
  canvas.height = Math.max(1, crop.sh);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire a 2D canvas context');
  }

  ctx.save();
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  // Load-bearing: puts the overlay back into un-mirrored space.
  ctx.restore();

  const overlay = options.overlay;
  if (overlay) {
    const dw = overlay.width * canvas.width;
    const dh =
      overlay.height != null
        ? overlay.height * canvas.height
        : // Keep the artwork's own proportions rather than stretching it.
          dw * (overlay.intrinsicHeight / Math.max(1, overlay.intrinsicWidth));

    ctx.save();
    if (overlay.opacity != null) {
      ctx.globalAlpha = Math.min(1, Math.max(0, overlay.opacity));
    }
    ctx.drawImage(
      overlay.image,
      overlay.x * canvas.width,
      overlay.y * canvas.height,
      dw,
      dh,
    );
    ctx.restore();
  }

  return canvas;
}

/**
 * `toBlob` is where a tainted canvas surfaces - it throws `SecurityError` rather
 * than returning null - so the throw is caught here and reported as a normal
 * rejection the caller can turn into a toast.
 */
export function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality = 0.92,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Canvas produced no image data')),
        'image/jpeg',
        quality,
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
