/**
 * The user's adjustment to a selfie overlay, and the gesture math that produces
 * it. Pure on purpose, like selfie-capture.util.ts - the angle and clamping edge
 * cases are the parts most worth unit testing.
 */

/**
 * Applied on top of the overlay's authored placement, never folded into it, so
 * the CMS model stays as authored and a reset is just dropping this.
 *
 * Scale and rotation pivot on the overlay's centre. The preview gets that from
 * CSS `transform-origin: 50% 50%` and composeSelfie() by translating to the
 * centre before drawing - the two have to agree, or the photo stops matching
 * what the user lined up.
 */
export interface OverlayTransform {
  /** Moves the overlay's centre, as fractions of the frame's width and height. */
  dx: number;
  dy: number;
  /** Uniform, so the artwork is never distorted. 1 is the authored size. */
  scale: number;
  /**
   * Radians, clockwise - the direction CSS `rotate()` and canvas `rotate()`
   * share in a y-down space.
   */
  rotation: number;
}

export const IDENTITY_TRANSFORM: OverlayTransform = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
};

/** Relative to the authored size. */
export const MIN_OVERLAY_SCALE = 0.25;
export const MAX_OVERLAY_SCALE = 4;

/**
 * Two fingers closer than this have no usable distance or angle between them -
 * and at exactly 0 the scale would divide by zero.
 */
const MIN_PINCH_SPAN_PX = 1;

export interface GesturePoint {
  x: number;
  y: number;
}

/** The range dx and dy may take during one gesture. */
export interface OffsetBounds {
  minDx: number;
  maxDx: number;
  minDy: number;
  maxDy: number;
}

/**
 * The transform a gesture has produced so far.
 *
 * `from` holds the fingers' positions when `start` was current and `to` the same
 * fingers now, in px. One finger pans; with two, only the first two count, and
 * they also pinch and twist. Panning is divided by the `frame`'s px size so the
 * result stays normalised.
 */
export function applyGesture(
  start: OverlayTransform,
  from: readonly GesturePoint[],
  to: readonly GesturePoint[],
  frame: { width: number; height: number },
  bounds: OffsetBounds,
): OverlayTransform {
  // A collapsed stage would turn every pan into Infinity.
  if (
    from.length === 0 ||
    to.length < from.length ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    return start;
  }

  let panX = to[0].x - from[0].x;
  let panY = to[0].y - from[0].y;
  let scale = start.scale;
  let rotation = start.rotation;

  if (from.length >= 2) {
    const [a0, b0] = from;
    const [a1, b1] = to;
    // A pinch pans by its midpoint, so moving both fingers together drags.
    panX = (a1.x + b1.x - a0.x - b0.x) / 2;
    panY = (a1.y + b1.y - a0.y - b0.y) / 2;

    const span0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
    if (span0 >= MIN_PINCH_SPAN_PX) {
      const span1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      scale = start.scale * (span1 / span0);
      rotation =
        start.rotation +
        withinHalfTurn(
          Math.atan2(b1.y - a1.y, b1.x - a1.x) -
            Math.atan2(b0.y - a0.y, b0.x - a0.x),
        );
    }
  }

  return {
    dx: clamp(start.dx + panX / frame.width, bounds.minDx, bounds.maxDx),
    dy: clamp(start.dy + panY / frame.height, bounds.minDy, bounds.maxDy),
    scale: clamp(scale, MIN_OVERLAY_SCALE, MAX_OVERLAY_SCALE),
    rotation: withinHalfTurn(rotation),
  };
}

/**
 * The same angle, within ±π. atan2 jumps by a full turn as the fingers pass the
 * horizontal; the overlay looks the same either way, but without this the
 * stored angle would drift by 2π each time.
 */
function withinHalfTurn(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
