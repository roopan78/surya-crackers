import { Injectable } from '@angular/core';
import { OtpAuthServiceBase } from './otp-auth.base';

/**
 * Admin session (SUPER_ADMIN/ADMIN roles). Separate localStorage keys from
 * CustomerAuthService — being logged in as an admin never implies a customer
 * session and vice versa — even though both authenticate against the same
 * `/api/auth/*` OTP endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends OtpAuthServiceBase {
  constructor() {
    super('sc_admin_token', 'sc_admin_user');
  }
}
