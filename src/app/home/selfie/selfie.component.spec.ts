import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { SelfieElementModel } from '../../shared/page.element/page.element.model';
import { SelfieComponent } from './selfie.component';

const MODEL: SelfieElementModel = {
  id: 1,
  order: 0,
  type: 'selfie',
  backgroundColor: null,
  textColor: null,
  title: 'Take a selfie',
  title_size: null,
  icon: null,
  shareText: null,
  overlays: null,
};

describe('SelfieComponent', () => {
  let component: SelfieComponent;
  let fixture: ComponentFixture<SelfieComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SelfieComponent],
      // ModalController is @Injectable() without providedIn, so it only exists
      // once Ionic's providers are present.
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(SelfieComponent);
    component = fixture.componentInstance;
    // The template dereferences the model, so it has to be set before the
    // first change detection run.
    fixture.componentRef.setInput('selfieElementModel', MODEL);
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the title', () => {
    const title: HTMLElement =
      fixture.nativeElement.querySelector('.title');
    expect(title.textContent?.trim()).toBe('Take a selfie');
  });
});
