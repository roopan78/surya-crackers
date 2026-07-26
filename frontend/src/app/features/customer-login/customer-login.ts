import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthForm } from '../../shared/components/auth-form/auth-form';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [RouterLink, AuthForm],
  templateUrl: './customer-login.html',
})
export class CustomerLogin {}
