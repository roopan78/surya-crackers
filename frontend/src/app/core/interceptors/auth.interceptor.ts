import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { environment } from '../../../environments/environment';

/**
 * Attaches the right bearer token to requests against our own API — the
 * admin token for `/admin/`-scoped URLs, the customer token otherwise (e.g.
 * `/orders/mine`) if a customer session exists. On a 401, only the matching
 * session is torn down and only admin-scoped requests force a redirect —
 * a customer-scoped 401 just lets the page fall back to guest behavior.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const customerAuthService = inject(CustomerAuthService);
  const router = inject(Router);

  const isAdminRequest = req.url.includes('/admin/');
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  let authorizedReq = req;
  if (isApiRequest) {
    const token = isAdminRequest ? authService.getToken() : (customerAuthService.getToken() ?? authService.getToken());
    if (token) {
      authorizedReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest) {
        if (isAdminRequest) {
          authService.logout();
          router.navigate(['/admin/login']);
        } else {
          customerAuthService.logout();
        }
      }
      return throwError(() => error);
    }),
  );
};
