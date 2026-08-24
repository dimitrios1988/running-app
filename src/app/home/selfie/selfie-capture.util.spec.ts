import { composeSelfie, computeCoverCrop } from './selfie-capture.util';

/** Solid-colour canvas, usable anywhere a CanvasImageSource is expected. */
function paint(
  width: number,
  height: number,
  bands: { color: string; x: number; w: number }[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  bands.forEach((band) => {
    ctx.fillStyle = band.color;
    ctx.fillRect(band.x, 0, band.w, height);
  });
  return canvas;
}

function pixelAt(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): [number, number, number] {
  const data = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
  return [data[0], data[1], data[2]];
}

describe('computeCoverCrop', () => {
  it('crops the sides when a landscape frame fills a portrait box', () => {
    // 640x480 into a 300x400 stage: scale = max(0.469, 0.833) = 0.833
    expect(computeCoverCrop(640, 480, 300, 400)).toEqual({
      sx: 140,
      sy: 0,
      sw: 360,
      sh: 480,
    });
  });

  it('crops the top and bottom when a portrait frame fills a landscape box', () => {
    expect(computeCoverCrop(480, 640, 400, 300)).toEqual({
      sx: 0,
      sy: 140,
      sw: 480,
      sh: 360,
    });
  });

  it('is a no-op when the aspect ratios already match', () => {
    expect(computeCoverCrop(1080, 1440, 300, 400)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1080,
      sh: 1440,
    });
  });

  it('produces a crop with the same aspect ratio as the box', () => {
    const crop = computeCoverCrop(1280, 720, 375, 500);
    expect(crop.sw / crop.sh).toBeCloseTo(375 / 500, 2);
  });

  it('survives a video that has not produced a frame yet', () => {
    expect(computeCoverCrop(0, 0, 300, 400)).toEqual({
      sx: 0,
      sy: 0,
      sw: 0,
      sh: 0,
    });
  });
});

describe('composeSelfie', () => {
  const red: [number, number, number] = [255, 0, 0];
  const blue: [number, number, number] = [0, 0, 255];

  // Left half red, right half blue.
  const source = () =>
    paint(400, 400, [
      { color: '#ff0000', x: 0, w: 200 },
      { color: '#0000ff', x: 200, w: 200 },
    ]);

  it('leaves the frame as-is when not mirroring', () => {
    const canvas = composeSelfie({
      source: source(),
      sourceWidth: 400,
      sourceHeight: 400,
      boxWidth: 400,
      boxHeight: 400,
      mirror: false,
      overlay: null,
    });

    expect(pixelAt(canvas, 50, 200)).toEqual(red);
    expect(pixelAt(canvas, 350, 200)).toEqual(blue);
  });

  it('swaps the halves when mirroring', () => {
    const canvas = composeSelfie({
      source: source(),
      sourceWidth: 400,
      sourceHeight: 400,
      boxWidth: 400,
      boxHeight: 400,
      mirror: true,
      overlay: null,
    });

    expect(pixelAt(canvas, 50, 200)).toEqual(blue);
    expect(pixelAt(canvas, 350, 200)).toEqual(red);
  });

  [false, true].forEach((mirror) => {
    it(`draws the overlay un-mirrored when mirror=${mirror}`, () => {
      // A green marker occupying the left 20% of the frame. If the overlay were
      // caught by the mirror transform it would land on the right instead.
      const canvas = composeSelfie({
        source: source(),
        sourceWidth: 400,
        sourceHeight: 400,
        boxWidth: 400,
        boxHeight: 400,
        mirror,
        overlay: {
          image: paint(100, 100, [{ color: '#00ff00', x: 0, w: 100 }]),
          intrinsicWidth: 100,
          intrinsicHeight: 100,
          x: 0,
          y: 0,
          width: 0.2,
          height: 0.2,
          opacity: null,
        },
      });

      expect(pixelAt(canvas, 20, 20)).toEqual([0, 255, 0]);
      expect(pixelAt(canvas, 380, 20)).not.toEqual([0, 255, 0]);
    });
  });

  it('derives the overlay height from the artwork when height is null', () => {
    // 100x50 artwork at width 0.5 of a 400px-wide frame -> 200x100 on canvas.
    const canvas = composeSelfie({
      source: source(),
      sourceWidth: 400,
      sourceHeight: 400,
      boxWidth: 400,
      boxHeight: 400,
      mirror: false,
      overlay: {
        image: paint(100, 50, [{ color: '#00ff00', x: 0, w: 100 }]),
        intrinsicWidth: 100,
        intrinsicHeight: 50,
        x: 0,
        y: 0,
        width: 0.5,
        height: null,
        opacity: null,
      },
    });

    expect(pixelAt(canvas, 100, 95)).toEqual([0, 255, 0]);
    // Just past the derived 100px height, the frame shows through again.
    expect(pixelAt(canvas, 100, 105)).toEqual(red);
  });

  it('sizes the canvas to the cover crop, not the box', () => {
    const canvas = composeSelfie({
      source: paint(640, 480, [{ color: '#ff0000', x: 0, w: 640 }]),
      sourceWidth: 640,
      sourceHeight: 480,
      boxWidth: 300,
      boxHeight: 400,
      mirror: false,
      overlay: null,
    });

    expect(canvas.width).toBe(360);
    expect(canvas.height).toBe(480);
    expect(canvas.width / canvas.height).toBeCloseTo(300 / 400, 5);
  });
});
