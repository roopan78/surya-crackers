import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, Order, PaymentMethodInfo, UpiDetails } from '../models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getAvailableMethods(): Observable<PaymentMethodInfo[]> {
    return this.http
      .get<ApiSuccess<PaymentMethodInfo[]>>(`${environment.apiUrl}/payments/methods`)
      .pipe(map((res) => res.data));
  }

  getUpiDetails(orderNumber: string): Observable<UpiDetails> {
    return this.http
      .get<ApiSuccess<UpiDetails>>(`${environment.apiUrl}/orders/${orderNumber}/upi-details`)
      .pipe(map((res) => res.data));
  }

  submitUtr(orderNumber: string, utrNumber: string): Observable<Order> {
    return this.http
      .post<ApiSuccess<Order>>(`${environment.apiUrl}/orders/${orderNumber}/submit-utr`, { utrNumber })
      .pipe(map((res) => res.data));
  }
}
