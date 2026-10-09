import {
  DestroyRef,
  Directive,
  ElementRef,
  NgZone,
  inject,
  input,
  output,
} from '@angular/core';
import {
  GesturePoint,
  OffsetBounds,
  OverlayTransform,
  applyGesture,
} from './selfie-overlay-transform';

/** How far one finger has to travel before it counts as a drag, not a tap. */
const TAP_SLOP_PX = 6;

interface Baseline {
  transform: OverlayTransform;
  points: GesturePoint[];
}

/**
 * Turns pointer input on its host into overlay transforms: one finger moves the
 * overlay, two pinch and twist it.
 *
 * The host is meant to cover the whole stage, not just the overlay - there is
 * only ever one overlay to steer, and a small one is hard to pinch with both
 * fingers on it. It needs `touch-action: none`, or the WebView takes the pinch
 * as page zoom and cancels the pointers.
 *
 * The listeners run outside the Angular zone and changes go out at most once per
 * animation frame: pointermove fires faster than the screen repaints, and every
 * event inside the zone would run change detection for the whole app.
 */
@Directive({
  selector: '[appSelfieOverlayGesture]',
  standalone: true,
})
export class SelfieOverlayGestureDirective {
  readonly transform = input.required<OverlayTransform>();
  /** Measured as each gesture starts, to keep its centre inside the stage. */
  readonly overlayElement = input.required<HTMLElement>();
  readonly transformChange = output<OverlayTransform>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  /** Insertion-ordered, so the first two entries are the fingers that steer. */
  private readonly pointers = new Map<number, GesturePoint>();
  /**
   * What the current fingers are measured against. Re-taken whenever one is
   * added or lifted, so the overlay carries on from where it is rather than
   * jumping.
   */
  private baseline: Baseline | null = null;
  /** The last value sent out - ahead of `transform()` until the parent re-renders. */
  private latest: OverlayTransform | null = null;
  private stageRect: DOMRect | null = null;
  private bounds: OffsetBounds | null = null;
  private dragging = false;
  private frameRequest = 0;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    // Not isPrimary alone: the primary finger can be resting on the reset
    // button, which leaves the first finger on this layer a secondary one.
    if (event.isPrimary || this.pointers.size === 0) {
      this.begin();
    } else {
      this.flush();
    }
    // Keeps the moves and the pointerup coming here once the pointer leaves the
    // stage - touch mostly gets that implicitly, a mouse never does.
    this.element.nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, pointOf(event));
    this.rebase();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A mouse moving with no button down is not part of a gesture.
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    this.pointers.set(event.pointerId, pointOf(event));
    if (!this.frameRequest) {
      this.frameRequest = requestAnimationFrame(() => {
        this.frameRequest = 0;
        this.update();
      });
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    // Settles the last movement against the fingers that made it, before one of
    // them goes.
    this.flush();
    this.pointers.delete(event.pointerId);
    this.rebase();
  };

  constructor() {
    const host = this.element.nativeElement;
    this.zone.runOutsideAngular(() => {
      host.addEventListener('pointerdown', this.onPointerDown);
      host.addEventListener('pointermove', this.onPointerMove);
      host.addEventListener('pointerup', this.onPointerEnd);
      host.addEventListener('pointercancel', this.onPointerEnd);
    });
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener('pointerdown', this.onPointerDown);
      host.removeEventListener('pointermove', this.onPointerMove);
      host.removeEventListener('pointerup', this.onPointerEnd);
      host.removeEventListener('pointercancel', this.onPointerEnd);
      cancelAnimationFrame(this.frameRequest);
    });
  }

  /** Starts a fresh gesture from wherever the overlay is now. */
  private begin(): void {
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    // Anything still tracked belongs to a sequence whose pointerup never came.
    this.pointers.clear();
    this.latest = null;
    this.dragging = false;

    const stage = this.element.nativeElement.getBoundingClientRect();
    // The bounding box of a rotated, scaled box shares that box's centre, so
    // this holds at any angle.
    const overlay = this.overlayElement().getBoundingClientRect();
    const cx = (overlay.left + overlay.width / 2 - stage.left) / stage.width;
    const cy = (overlay.top + overlay.height / 2 - stage.top) / stage.height;
    const { dx, dy } = this.transform();

    this.stageRect = stage;
    // Keeps the centre inside the stage, so the overlay can never be dragged
    // out of reach. Expressed as limits on the offset, they hold for the whole
    // gesture.
    this.bounds = {
      minDx: dx - cx,
      maxDx: dx + 1 - cx,
      minDy: dy - cy,
      maxDy: dy + 1 - cy,
    };
  }

  private rebase(): void {
    const points = this.activePoints();
    this.baseline =
      points.length > 0
        ? { transform: this.latest ?? this.transform(), points }
        : null;
  }

  /** Applies a movement still waiting for its frame, now. */
  private flush(): void {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      this.update();
    }
  }

  private update(): void {
    const baseline = this.baseline;
    const points = this.activePoints();
    if (!baseline || !this.stageRect || !this.bounds || points.length === 0) {
      return;
    }

    if (!this.dragging) {
      // A second finger is a deliberate pinch, but a lone one has to clear the
      // slop first, so a tap leaves the overlay exactly where it was.
      if (
        points.length < 2 &&
        distance(points[0], baseline.points[0]) < TAP_SLOP_PX
      ) {
        return;
      }
      this.dragging = true;
    }

    const next = applyGesture(
      baseline.transform,
      baseline.points,
      points,
      this.stageRect,
      this.bounds,
    );
    this.latest = next;
    this.zone.run(() => this.transformChange.emit(next));
  }

  private activePoints(): GesturePoint[] {
    return [...this.pointers.values()].slice(0, 2);
  }
}

function pointOf(event: PointerEvent): GesturePoint {
  return { x: event.clientX, y: event.clientY };
}

function distance(a: GesturePoint, b: GesturePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
