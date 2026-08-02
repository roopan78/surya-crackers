import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthForm } from '../../../shared/components/auth-form/auth-form';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterLink, AuthForm],
  templateUrl: './login.html',
})
export class AdminLogin {
  constructor() {
    inject(SeoService).update({
      title: 'Admin Login | Surya Crackers',
      description: 'Surya Crackers staff sign-in.',
      path: '/admin/login',
      robots: 'noindex,nofollow',
    });
  }
}
