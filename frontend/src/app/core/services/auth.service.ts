import { Injectable } from '@angular/core';
import { AuthServiceBase } from './auth.base';

/**
 * Admin session (SUPER_ADMIN/ADMIN roles). Separate localStorage keys from
 * CustomerAuthService — being logged in as an admin never implies a customer
 * session and vice versa — even though both authenticate against the same
 * `/api/auth/*` endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends AuthServiceBase {
  constructor() {
    super('sc_admin_token', 'sc_admin_user');
  }
}
