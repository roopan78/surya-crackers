import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { AuthService } from '../services/auth.service';

/**
 * Defense-in-depth only — the backend is the real enforcement point for
 * every RBAC-guarded endpoint. This just keeps an under-privileged admin
 * from landing on a screen (e.g. /admin/users) whose API calls would 403.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.currentUser()?.role;
    if (role && roles.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/admin']);
  };
}
