import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AgeVerificationService } from '../services/age-verification.service';

/**
 * Statutory 18+ age gate. Blocks access to the storefront until the
 * visitor has confirmed their age in this browser (cached in
 * localStorage via AgeVerificationService). Unverified visitors are
 * redirected to the full-screen `/age-verification` interstitial.
 */
export const ageGuard: CanActivateFn = (_route, state) => {
  const ageVerificationService = inject(AgeVerificationService);
  const router = inject(Router);

  if (ageVerificationService.isVerified()) {
    return true;
  }

  return router.createUrlTree(['/age-verification'], {
    queryParams: { redirectTo: state.url },
  });
};
