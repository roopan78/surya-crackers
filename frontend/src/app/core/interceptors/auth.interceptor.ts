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
  let sentWithToken = false;
  if (isApiRequest) {
    const token = isAdminRequest ? authService.getToken() : (customerAuthService.getToken() ?? authService.getToken());
    if (token) {
      authorizedReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      sentWithToken = true;
    }
  }

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      // Only a request that actually carried a token can tell us the session is
      // dead. A 401 on a request we sent anonymously says nothing about the
      // stored session, and tearing it down there is how a signed-in customer
      // ended up with an empty token while the page still looked signed in.
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest && sentWithToken) {
        if (isAdminRequest) {
          authService.logout();
          router.navigate(['/admin/login']);
        } else {
          customerAuthService.logout();
          // Say so, rather than leaving them typing into a form whose every
          // submit will fail. Admin-area pages keep their own redirect above.
          if (!router.url.startsWith('/admin')) {
            router.navigate(['/login'], { queryParams: { redirectTo: router.url } });
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
