import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NewsViewerComponent } from './news.viewer.component';

describe('NewsViewerComponent', () => {
  let component: NewsViewerComponent;
  let fixture: ComponentFixture<NewsViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NewsViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
