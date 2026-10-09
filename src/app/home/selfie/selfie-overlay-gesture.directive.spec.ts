import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelfieOverlayGestureDirective } from './selfie-overlay-gesture.directive';
import {
  IDENTITY_TRANSFORM,
  OverlayTransform,
} from './selfie-overlay-transform';

@Component({
  standalone: true,
  imports: [SelfieOverlayGestureDirective],
  template: `
    <div style="position: relative; width: 300px; height: 400px">
      <div
        #overlay
        style="position: absolute; left: 100px; top: 100px; width: 100px; height: 100px"
      ></div>
      <div
        class="layer"
        style="position: absolute; inset: 0"
        appSelfieOverlayGesture
        [transform]="transform()"
        [overlayElement]="overlay"
        (transformChange)="onTransform($event)"
      ></div>
    </div>
  `,
})
class HostComponent {
  readonly transform = signal<OverlayTransform>(IDENTITY_TRANSFORM);
  readonly emitted: OverlayTransform[] = [];

  onTransform(transform: OverlayTransform): void {
    this.emitted.push(transform);
    this.transform.set(transform);
  }
}

/** Resolves after the directive's own frame callback, which was queued first. */
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('SelfieOverlayGestureDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let layer: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    layer = fixture.nativeElement.querySelector('.layer');
    // Synthetic pointers are never "active", so the real call would throw.
    spyOn(layer, 'setPointerCapture');
  });

  const send = (type: string, id: number, x: number, y: number): void => {
    layer.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType: 'touch',
        isPrimary: id === 1,
        clientX: x,
        clientY: y,
        bubbles: true,
      }),
    );
  };

  const lastEmitted = (): OverlayTransform =>
    host.emitted[host.emitted.length - 1];

  it('moves the overlay by a one-finger drag, as a fraction of the stage', async () => {
    send('pointerdown', 1, 100, 100);
    send('pointermove', 1, 130, 140);
    await nextFrame();

    expect(lastEmitted().dx).toBeCloseTo(30 / 300, 10);
    expect(lastEmitted().dy).toBeCloseTo(40 / 400, 10);
  });

  it('ignores a tap that wobbles less than the slop', async () => {
    send('pointerdown', 1, 100, 100);
    send('pointermove', 1, 103, 102);
    await nextFrame();
    send('pointerup', 1, 103, 102);

    expect(host.emitted).toEqual([]);
  });

  it('carries on without a jump when one finger of a pinch lifts', async () => {
    send('pointerdown', 1, 100, 200);
    send('pointerdown', 2, 200, 200);
    // Twice as far apart, about the same midpoint.
    send('pointermove', 1, 50, 200);
    send('pointermove', 2, 250, 200);
    await nextFrame();
    expect(lastEmitted().scale).toBeCloseTo(2, 10);

    send('pointerup', 2, 250, 200);
    // Only what the remaining finger does from here may count.
    send('pointermove', 1, 80, 200);
    await nextFrame();

    expect(lastEmitted().scale).toBeCloseTo(2, 10);
    expect(lastEmitted().dx).toBeCloseTo(30 / 300, 10);
    expect(lastEmitted().dy).toBeCloseTo(0, 10);
  });
});
