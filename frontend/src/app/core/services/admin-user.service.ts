import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListMeta, ApiSuccess, AuthUser, Role } from '../models';

const ADMIN_USERS_BASE = `${environment.apiUrl}/admin/users`;

export interface ActiveOrder {
  orderNumber: string;
  status: string;
}

export interface DeleteUserResult {
  message: string;
  cancelledOrders: number;
  detachedOrders: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);

  private readonly usersSignal = signal<AuthUser[]>([]);
  private readonly metaSignal = signal<ApiListMeta | null>(null);
  private readonly loadingSignal = signal(true);

  readonly users = this.usersSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  loadUsers(options: { role?: Role | ''; search?: string } = {}): void {
    let params = new HttpParams().set('page', '1').set('limit', '100');
    if (options.role) params = params.set('role', options.role);
    if (options.search) params = params.set('search', options.search);

    this.loadingSignal.set(true);
    this.http.get<ApiSuccess<AuthUser[]>>(ADMIN_USERS_BASE, { params }).subscribe({
      next: (res) => {
        this.usersSignal.set(res.data);
        this.metaSignal.set(res.meta ?? null);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  updateRole(id: string, role: Role): Observable<AuthUser> {
    return this.http.patch<ApiSuccess<AuthUser>>(`${ADMIN_USERS_BASE}/${id}/role`, { role }).pipe(map((res) => res.data));
  }

  /** Reversible: the account is switched off but kept for 90 days. */
  deactivate(id: string): Observable<AuthUser> {
    return this.http
      .post<ApiSuccess<AuthUser>>(`${ADMIN_USERS_BASE}/${id}/deactivate`, {})
      .pipe(map((res) => res.data));
  }

  reactivate(id: string): Observable<AuthUser> {
    return this.http
      .post<ApiSuccess<AuthUser>>(`${ADMIN_USERS_BASE}/${id}/reactivate`, {})
      .pipe(map((res) => res.data));
  }

  /** Irreversible, SUPER_ADMIN only. Cancels whatever is still in progress. */
  deleteUser(id: string): Observable<DeleteUserResult> {
    return this.http
      .delete<ApiSuccess<DeleteUserResult>>(`${ADMIN_USERS_BASE}/${id}`)
      .pipe(map((res) => res.data));
  }

  /** What is blocking a deactivation, so the screen can name the orders. */
  activeOrders(id: string): Observable<ActiveOrder[]> {
    return this.http
      .get<ApiSuccess<ActiveOrder[]>>(`${ADMIN_USERS_BASE}/${id}/active-orders`)
      .pipe(map((res) => res.data));
  }
}
