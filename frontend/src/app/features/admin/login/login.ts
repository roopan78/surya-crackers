import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthForm } from '../../../shared/components/auth-form/auth-form';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterLink, AuthForm],
  templateUrl: './login.html',
})
export class AdminLogin {}
