import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models';

const TOKEN_KEY = 'sc_admin_token';
const USERNAME_KEY = 'sc_admin_username';

interface AdminSummary {
  id: string;
  username: string;
}

interface LoginResponse {
  token: string;
  admin: AdminSummary;
}

/**
 * Owns the admin session: login/logout against the backend JWT endpoints,
 * and the bearer token used by `authInterceptor`. Token lives in
 * localStorage (not the httpOnly cookie the backend also sets) since the
 * frontend and API are on different subdomains — a bearer header sidesteps
 * cross-subdomain cookie/SameSite configuration entirely.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(this.readStorage(TOKEN_KEY));
  private readonly usernameSignal = signal<string | null>(this.readStorage(USERNAME_KEY));

  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  readonly username = this.usernameSignal.asReadonly();

  login(username: string, password: string): Observable<AdminSummary> {
    return this.http
      .post<ApiSuccess<LoginResponse>>(`${environment.apiUrl}/admin/auth/login`, { username, password })
      .pipe(
        tap((res) => this.setSession(res.data.token, res.data.admin.username)),
        map((res) => res.data.admin),
      );
  }

  logout(): void {
    this.clearSession();
    this.http.post(`${environment.apiUrl}/admin/auth/logout`, {}).pipe(catchError(() => of(null))).subscribe();
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setSession(token: string, username: string): void {
    this.tokenSignal.set(token);
    this.usernameSignal.set(username);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USERNAME_KEY, username);
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.usernameSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  }

  private readStorage(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
}
