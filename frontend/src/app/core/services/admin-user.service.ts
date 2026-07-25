import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListMeta, ApiSuccess, AuthUser, Role } from '../models';

const ADMIN_USERS_BASE = `${environment.apiUrl}/admin/users`;

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
}
