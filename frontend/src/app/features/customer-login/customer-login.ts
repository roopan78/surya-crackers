import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OtpLoginForm } from '../../shared/components/otp-login-form/otp-login-form';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [RouterLink, OtpLoginForm],
  templateUrl: './customer-login.html',
})
export class CustomerLogin {}
