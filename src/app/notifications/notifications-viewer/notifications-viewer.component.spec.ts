import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NotificationsViewerComponent } from './notifications-viewer.component';

describe('NotificationsViewerComponent', () => {
  let component: NotificationsViewerComponent;
  let fixture: ComponentFixture<NotificationsViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NotificationsViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
