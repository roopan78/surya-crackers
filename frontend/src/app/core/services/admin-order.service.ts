import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListMeta, ApiSuccess } from '../models';

export type OrderStatus = 'PENDING_WHATSAPP' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  boxQuantity: string;
  boxes: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  phone: string;
  preferredDate: string;
  items: OrderItem[];
  estimatedTotal: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

const ADMIN_ORDERS_BASE = `${environment.apiUrl}/admin/orders`;

/**
 * Admin order list + status updates. Kept separate from AdminCatalogService
 * since orders are a distinct domain (no create/delete, just list + status
 * transitions) that didn't exist in any UI before this dashboard.
 */
@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly http = inject(HttpClient);

  private readonly ordersSignal = signal<AdminOrder[]>([]);
  private readonly metaSignal = signal<ApiListMeta | null>(null);
  private readonly loadingSignal = signal(true);

  readonly orders = this.ordersSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  loadOrders(options: { status?: OrderStatus | ''; page?: number; limit?: number } = {}): void {
    let params = new HttpParams()
      .set('page', String(options.page ?? 1))
      .set('limit', String(options.limit ?? 100))
      .set('sort', 'desc');
    if (options.status) {
      params = params.set('status', options.status);
    }

    this.loadingSignal.set(true);
    this.http.get<ApiSuccess<AdminOrder[]>>(ADMIN_ORDERS_BASE, { params }).subscribe({
      next: (res) => {
        this.ordersSignal.set(res.data);
        this.metaSignal.set(res.meta ?? null);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  updateStatus(id: string, status: OrderStatus): Observable<AdminOrder> {
    return this.http.patch<ApiSuccess<AdminOrder>>(`${ADMIN_ORDERS_BASE}/${id}/status`, { status }).pipe(
      map((res) => res.data),
    );
  }
}
