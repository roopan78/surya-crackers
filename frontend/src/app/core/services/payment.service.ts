import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, PaymentMethodInfo } from '../models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getAvailableMethods(): Observable<PaymentMethodInfo[]> {
    return this.http
      .get<ApiSuccess<PaymentMethodInfo[]>>(`${environment.apiUrl}/payments/methods`)
      .pipe(map((res) => res.data));
  }
}
