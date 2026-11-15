import { TestBed } from '@angular/core/testing';
import { clientConfig } from '../../environments/client.generated';
import {
  FEATURE_FLAGS,
  FeatureFlags,
  FeatureFlagsService,
} from './feature-flags.service';

describe('FeatureFlagsService', () => {
  function create(flags?: FeatureFlags): FeatureFlagsService {
    TestBed.configureTestingModule({
      providers: flags ? [{ provide: FEATURE_FLAGS, useValue: flags }] : [],
    });
    return TestBed.inject(FeatureFlagsService);
  }

  it('reports a flag that is switched on', () => {
    expect(create({ myRace: true }).isEnabled('myRace')).toBeTrue();
  });

  it('reports a flag that is switched off', () => {
    expect(create({ myRace: false }).isEnabled('myRace')).toBeFalse();
  });

  it('treats a flag that is missing from the config as off', () => {
    expect(create({} as FeatureFlags).isEnabled('myRace')).toBeFalse();
  });

  it("uses the flags generated for the active client by default", () => {
    expect(create().isEnabled('myRace')).toBe(clientConfig.features.myRace);
  });
});
