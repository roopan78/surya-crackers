import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects the `/admin/*` workspace routes. Unlike the storefront's
 * ageGuard, this gates on a real backend session (JWT), not just a local
 * client-side flag.
 */
export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { redirectTo: state.url },
  });
};
