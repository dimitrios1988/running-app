import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { TabsPage } from './tabs.page';
import { FEATURE_FLAGS } from '../client/feature-flags.service';

describe('TabsPage', () => {
  async function create(myRace: boolean): Promise<ComponentFixture<TabsPage>> {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        provideTranslateService(),
        { provide: FEATURE_FLAGS, useValue: { myRace } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
    return fixture;
  }

  function tabNames(fixture: ComponentFixture<TabsPage>): (string | null)[] {
    const buttons: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('ion-tab-button');
    return Array.from(buttons).map((button) => button.getAttribute('tab'));
  }

  it('should create', async () => {
    const fixture = await create(true);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the My Registration tab when the myRace feature is on', async () => {
    const fixture = await create(true);

    expect(tabNames(fixture)).toEqual(['home', 'myrace', 'notifications']);
  });

  it('hides the My Registration tab when the myRace feature is off', async () => {
    const fixture = await create(false);

    expect(tabNames(fixture)).toEqual(['home', 'notifications']);
  });
});
