import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureFlag, FeatureFlagsService } from './feature-flags.service';

/**
 * Keeps a route unreachable while its feature is switched off for this client.
 * Hiding the link is not enough on its own - a stored URL or a notification
 * deep link could still land on the page - so the route sends the user home.
 */
export function featureFlagGuard(flag: FeatureFlag): CanActivateFn {
  return () =>
    inject(FeatureFlagsService).isEnabled(flag) ||
    inject(Router).createUrlTree(['/tabs/home']);
}
