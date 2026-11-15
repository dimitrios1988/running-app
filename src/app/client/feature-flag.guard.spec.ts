import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { featureFlagGuard } from './feature-flag.guard';
import { FEATURE_FLAGS } from './feature-flags.service';

describe('featureFlagGuard', () => {
  function run(myRace: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FEATURE_FLAGS, useValue: { myRace } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      featureFlagGuard('myRace')(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
  }

  it('lets the route activate when the feature is on', () => {
    expect(run(true)).toBeTrue();
  });

  it('sends the user home when the feature is off', () => {
    const result = run(false);

    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/tabs/home',
    );
  });
});
