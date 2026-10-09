import {
  GesturePoint,
  IDENTITY_TRANSFORM,
  MAX_OVERLAY_SCALE,
  MIN_OVERLAY_SCALE,
  OffsetBounds,
  OverlayTransform,
  applyGesture,
} from './selfie-overlay-transform';

const FRAME = { width: 300, height: 400 };
/** Wide enough that nothing in these tests reaches it. */
const OPEN: OffsetBounds = { minDx: -10, maxDx: 10, minDy: -10, maxDy: 10 };

const degrees = (d: number): number => (d * Math.PI) / 180;

/** A point `length` px from `origin`, `angle` radians clockwise from +x. */
function polar(
  origin: GesturePoint,
  angle: number,
  length: number,
): GesturePoint {
  return {
    x: origin.x + Math.cos(angle) * length,
    y: origin.y + Math.sin(angle) * length,
  };
}

describe('applyGesture', () => {
  it('pans by one finger as a fraction of the frame', () => {
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [{ x: 100, y: 100 }],
      [{ x: 130, y: 60 }],
      FRAME,
      OPEN,
    );

    expect(next.dx).toBeCloseTo(30 / 300, 10);
    expect(next.dy).toBeCloseTo(-40 / 400, 10);
    expect(next.scale).toBe(1);
    expect(next.rotation).toBe(0);
  });

  it('builds on the transform the gesture started from', () => {
    const start: OverlayTransform = {
      dx: 0.1,
      dy: 0.2,
      scale: 2,
      rotation: 0.5,
    };
    const next = applyGesture(
      start,
      [{ x: 0, y: 0 }],
      [{ x: 30, y: 40 }],
      FRAME,
      OPEN,
    );

    expect(next.dx).toBeCloseTo(0.2, 10);
    expect(next.dy).toBeCloseTo(0.3, 10);
    expect(next.scale).toBe(2);
    expect(next.rotation).toBeCloseTo(0.5, 10);
  });

  it('scales by how far apart two fingers move', () => {
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      [
        { x: 50, y: 200 },
        { x: 250, y: 200 },
      ],
      FRAME,
      OPEN,
    );

    expect(next.scale).toBeCloseTo(2, 10);
    // Spread evenly about the same midpoint, so nothing pans.
    expect(next.dx).toBeCloseTo(0, 10);
    expect(next.dy).toBeCloseTo(0, 10);
  });

  it('rotates by how far the two fingers turn', () => {
    // A quarter turn clockwise on screen, about their shared midpoint.
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      [
        { x: 150, y: 150 },
        { x: 150, y: 250 },
      ],
      FRAME,
      OPEN,
    );

    expect(next.rotation).toBeCloseTo(Math.PI / 2, 10);
    expect(next.scale).toBeCloseTo(1, 10);
  });

  it('pans by the midpoint of two fingers', () => {
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      [
        { x: 130, y: 240 },
        { x: 230, y: 240 },
      ],
      FRAME,
      OPEN,
    );

    expect(next.dx).toBeCloseTo(30 / 300, 10);
    expect(next.dy).toBeCloseTo(40 / 400, 10);
    expect(next.scale).toBeCloseTo(1, 10);
    expect(next.rotation).toBeCloseTo(0, 10);
  });

  it('turns the short way when the fingers cross the horizontal', () => {
    // atan2 jumps from 179 to -179 degrees here, but the fingers only moved 2.
    const origin = { x: 150, y: 200 };
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [origin, polar(origin, degrees(179), 100)],
      [origin, polar(origin, degrees(-179), 100)],
      FRAME,
      OPEN,
    );

    expect(next.rotation).toBeCloseTo(degrees(2), 10);
  });

  it('keeps the stored angle within half a turn either way', () => {
    const start: OverlayTransform = {
      ...IDENTITY_TRANSFORM,
      rotation: degrees(170),
    };
    // Another quarter turn clockwise makes 260 degrees, i.e. -100.
    const next = applyGesture(
      start,
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      [
        { x: 150, y: 150 },
        { x: 150, y: 250 },
      ],
      FRAME,
      OPEN,
    );

    expect(next.rotation).toBeCloseTo(degrees(-100), 10);
  });

  it('clamps the scale', () => {
    const grown = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 140, y: 200 },
        { x: 160, y: 200 },
      ],
      [
        { x: 0, y: 200 },
        { x: 300, y: 200 },
      ],
      FRAME,
      OPEN,
    );
    const shrunk = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 0, y: 200 },
        { x: 300, y: 200 },
      ],
      [
        { x: 140, y: 200 },
        { x: 160, y: 200 },
      ],
      FRAME,
      OPEN,
    );

    expect(grown.scale).toBe(MAX_OVERLAY_SCALE);
    expect(shrunk.scale).toBe(MIN_OVERLAY_SCALE);
  });

  it('clamps the offset to the bounds', () => {
    const bounds: OffsetBounds = {
      minDx: -0.1,
      maxDx: 0.2,
      minDy: -0.3,
      maxDy: 0.4,
    };
    const forward = applyGesture(
      IDENTITY_TRANSFORM,
      [{ x: 0, y: 0 }],
      [{ x: 3000, y: 4000 }],
      FRAME,
      bounds,
    );
    const back = applyGesture(
      IDENTITY_TRANSFORM,
      [{ x: 3000, y: 4000 }],
      [{ x: 0, y: 0 }],
      FRAME,
      bounds,
    );

    expect([forward.dx, forward.dy]).toEqual([0.2, 0.4]);
    expect([back.dx, back.dy]).toEqual([-0.1, -0.3]);
  });

  it('only pans when the two fingers started on the same spot', () => {
    // No distance or angle to measure from - this must not give Infinity or NaN.
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [
        { x: 150, y: 200 },
        { x: 150, y: 200 },
      ],
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      FRAME,
      OPEN,
    );

    expect(next).toEqual(IDENTITY_TRANSFORM);
  });

  it('leaves the transform alone for a collapsed frame', () => {
    const next = applyGesture(
      IDENTITY_TRANSFORM,
      [{ x: 0, y: 0 }],
      [{ x: 30, y: 40 }],
      { width: 0, height: 0 },
      OPEN,
    );

    expect(next).toBe(IDENTITY_TRANSFORM);
  });
});
