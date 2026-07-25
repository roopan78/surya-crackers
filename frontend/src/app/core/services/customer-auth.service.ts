import { Injectable } from '@angular/core';
import { OtpAuthServiceBase } from './otp-auth.base';

/** Customer session (CUSTOMER role, optional — guest checkout never requires this). */
@Injectable({ providedIn: 'root' })
export class CustomerAuthService extends OtpAuthServiceBase {
  constructor() {
    super('sc_customer_token', 'sc_customer_user');
  }
}
