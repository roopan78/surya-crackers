import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, CartItem, Order, OrderDetails, PaymentStatus } from '../models';

export interface CreateOrderResult {
  orderNumber: string;
  id: string;
  estimatedTotal: number;
  paymentStatus: PaymentStatus;
}

interface CreateOrderPayload {
  guestName?: string;
  guestMobile?: string;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  items: {
    productId: string;
    name: string;
    price: number;
    boxQuantity: string;
    boxes: number;
  }[];
}

/** Persists a checkout as an on-hold order row. No payment is taken — staff arrange that when they confirm. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  createOrder(details: OrderDetails, items: CartItem[], isRegisteredCustomer: boolean): Observable<CreateOrderResult> {
    const payload: CreateOrderPayload = {
      ...(isRegisteredCustomer ? {} : { guestName: details.name, guestMobile: details.mobile }),
      pickupDate: details.pickupDate,
      pickupTime: details.pickupTime,
      notes: details.notes,
      items: items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        boxQuantity: item.product.boxQuantity,
        boxes: item.boxes,
      })),
    };

    return this.http
      .post<ApiSuccess<CreateOrderResult>>(`${environment.apiUrl}/orders`, payload)
      .pipe(map((res) => res.data));
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<ApiSuccess<Order[]>>(`${environment.apiUrl}/orders/mine`).pipe(map((res) => res.data));
  }
}
