import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthForm } from '../../shared/components/auth-form/auth-form';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [RouterLink, AuthForm],
  templateUrl: './customer-login.html',
})
export class CustomerLogin {
  /** Kept in sync with the form via two-way binding so the heading matches the mode. */
  readonly isRegistering = signal(false);

  constructor() {
    inject(SeoService).update({
      title: 'Sign In | Surya Crackers',
      description: 'Sign in or create your Surya Crackers account to track orders and check out faster.',
      path: '/login',
      robots: 'noindex,follow',
    });
  }
}
