import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OtpLoginForm } from '../../../shared/components/otp-login-form/otp-login-form';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterLink, OtpLoginForm],
  templateUrl: './login.html',
})
export class AdminLogin {}
