import { inject, Injectable, InjectionToken } from '@angular/core';
import {
  clientConfig,
  FeatureFlag,
} from '../../environments/client.generated';

export type { FeatureFlag };
export type FeatureFlags = Readonly<Record<FeatureFlag, boolean>>;

/**
 * The feature flags of the client this build was made for.
 *
 * They are fixed at build time: `scripts/build-client.js` merges
 * `clients/base.config.json` (the list of flags and their defaults) with the
 * client's own `config.json` and writes the result into
 * `src/environments/client.generated.ts`. Tests can provide their own value
 * for this token to exercise both states of a flag.
 */
export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS', {
  providedIn: 'root',
  factory: () => clientConfig.features,
});

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagsService {
  private readonly flags = inject(FEATURE_FLAGS);

  /**
   * Whether a feature is switched on for this client. `FeatureFlag` only
   * accepts names declared in `clients/base.config.json`, so a misspelt flag
   * fails to compile instead of quietly reading as "off".
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] === true;
  }
}
