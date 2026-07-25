import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, CartItem, OrderDetails } from '../models';

export interface CreateOrderResult {
  orderNumber: string;
  id: string;
  estimatedTotal: number;
}

interface CreateOrderPayload {
  customerName: string;
  deliveryAddress: string;
  phone: string;
  preferredDate: string;
  items: {
    productId: string;
    name: string;
    price: number;
    boxQuantity: string;
    boxes: number;
  }[];
}

/** Persists a checkout as a real order row before the WhatsApp handoff. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  createOrder(details: OrderDetails, items: CartItem[]): Observable<CreateOrderResult> {
    const payload: CreateOrderPayload = {
      customerName: details.name,
      deliveryAddress: details.address,
      phone: details.phone,
      preferredDate: details.targetDate,
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
}
