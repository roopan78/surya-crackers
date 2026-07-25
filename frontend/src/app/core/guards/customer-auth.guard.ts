import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CustomerAuthService } from '../services/customer-auth.service';

/** Protects `/account/*` — never applied to checkout, which stays guest-friendly by default. */
export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const customerAuthService = inject(CustomerAuthService);
  const router = inject(Router);

  if (customerAuthService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};
