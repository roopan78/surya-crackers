import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListMeta, ApiSuccess, Order, OrderStatus, RecordablePaymentProvider } from '../models';

const ADMIN_ORDERS_BASE = `${environment.apiUrl}/admin/orders`;

/**
 * Admin order list + status/payment updates. Kept separate from
 * AdminCatalogService since orders are a distinct domain (no create/delete,
 * just list + status/payment transitions).
 */
@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly http = inject(HttpClient);

  private readonly ordersSignal = signal<Order[]>([]);
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
    this.http.get<ApiSuccess<Order[]>>(ADMIN_ORDERS_BASE, { params }).subscribe({
      next: (res) => {
        this.ordersSignal.set(res.data);
        this.metaSignal.set(res.meta ?? null);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<ApiSuccess<Order>>(`${ADMIN_ORDERS_BASE}/${id}/status`, { status }).pipe(map((res) => res.data));
  }

  /**
   * Rebuilds an order staff cannot fill as it was placed — a line dropped
   * because the godown is empty, a count cut, a substitute added.
   *
   * Only the product and the box count are sent. Names and prices are read back
   * out of the catalog server-side, so this cannot reprice an order however the
   * client asks it to.
   */
  restructure(id: string, items: { productId: string; boxes: number }[]): Observable<Order> {
    return this.http
      .patch<ApiSuccess<Order>>(`${ADMIN_ORDERS_BASE}/${id}/items`, { items })
      .pipe(map((res) => res.data));
  }

  /**
   * Records a payment staff collected. The method travels with the request
   * because the order has none until now — the customer never chose one.
   */
  recordPayment(id: string, paymentProvider: RecordablePaymentProvider): Observable<Order> {
    return this.http
      .patch<ApiSuccess<Order>>(`${ADMIN_ORDERS_BASE}/${id}/payment`, { paymentProvider })
      .pipe(map((res) => res.data));
  }
}
