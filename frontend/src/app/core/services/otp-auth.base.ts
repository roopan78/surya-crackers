import { computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, AuthUser } from '../models';

interface OtpLoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * Shared session logic for the two OTP-based auth surfaces (admin, customer).
 * Both hit the same backend endpoints (`/api/auth/*`) — what makes them
 * "separate" is the storage keys (so being logged in as one never implies
 * the other) and the guards/redirect targets built on top, not the wire
 * protocol. Subclasses just pick storage keys via the constructor.
 */
export abstract class OtpAuthServiceBase {
  protected readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  readonly currentUser = this.userSignal.asReadonly();

  constructor(
    private readonly tokenStorageKey: string,
    private readonly userStorageKey: string,
  ) {
    this.tokenSignal.set(this.readStorage(tokenStorageKey));
    const rawUser = this.readStorage(userStorageKey);
    this.userSignal.set(rawUser ? (JSON.parse(rawUser) as AuthUser) : null);
  }

  sendOtp(mobile: string): Observable<{ devCode?: string }> {
    return this.http
      .post<ApiSuccess<{ devCode?: string }>>(`${environment.apiUrl}/auth/send-otp`, { mobile })
      .pipe(map((res) => res.data));
  }

  verifyOtp(mobile: string, code: string): Observable<AuthUser> {
    return this.http
      .post<ApiSuccess<OtpLoginResponse>>(`${environment.apiUrl}/auth/verify-otp`, { mobile, code })
      .pipe(
        tap((res) => this.setSession(res.data.token, res.data.user)),
        map((res) => res.data.user),
      );
  }

  updateProfile(name: string): Observable<AuthUser> {
    return this.http.patch<ApiSuccess<AuthUser>>(`${environment.apiUrl}/auth/me`, { name }).pipe(
      tap((res) => {
        const token = this.getToken();
        if (token) {
          this.setSession(token, res.data);
        }
      }),
      map((res) => res.data),
    );
  }

  logout(): void {
    this.clearSession();
    this.http
      .post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setSession(token: string, user: AuthUser): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
  }

  private readStorage(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
}
