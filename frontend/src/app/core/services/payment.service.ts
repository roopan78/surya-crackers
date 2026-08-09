import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, PaymentMethodInfo } from '../models';

/**
 * Payment options offered at checkout. Only Cash on Pickup remains — the UPI QR
 * and PhonePe flows were withdrawn following the 2018 Supreme Court restrictions
 * on firecracker sales, so orders are confirmed by staff and settled in person.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getAvailableMethods(): Observable<PaymentMethodInfo[]> {
    return this.http
      .get<ApiSuccess<PaymentMethodInfo[]>>(`${environment.apiUrl}/payments/methods`)
      .pipe(map((res) => res.data));
  }
}
