import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TrackingViewerComponent } from './tracking-viewer.component';

describe('TrackingViewerComponent', () => {
  let component: TrackingViewerComponent;
  let fixture: ComponentFixture<TrackingViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TrackingViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackingViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
