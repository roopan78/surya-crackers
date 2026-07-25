import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the admin bearer token to every request against our own API,
 * and bounces back to the login screen if the token has expired/been
 * rejected (401) on an admin-scoped call.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const isAdminRequest = req.url.includes('/admin/');
  const authorizedReq = token && isAdminRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isAdminRequest) {
        authService.logout();
        router.navigate(['/admin/login']);
      }
      return throwError(() => error);
    }),
  );
};
