import { Component, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, LogIn, TriangleAlert, Pencil } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

/**
 * Reusable mobile → OTP login flow, shared by the admin and customer login
 * pages (they hit the same backend endpoints — only the storage key/session
 * and the post-login redirect differ, both handled here via `mode`). Page
 * chrome (dark admin vs light customer) lives in the two wrapping pages.
 */
@Component({
  selector: 'app-otp-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './otp-login-form.html',
})
export class OtpLoginForm {
  readonly mode = input<'admin' | 'customer'>('customer');
  readonly dark = input(false);

  private readonly authService = inject(AuthService);
  private readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  readonly LogInIcon = LogIn;
  readonly TriangleAlertIcon = TriangleAlert;
  readonly PencilIcon = Pencil;

  readonly step = signal<'mobile' | 'otp'>('mobile');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly devCode = signal<string | null>(null);

  readonly mobileForm = this.formBuilder.nonNullable.group({
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  readonly otpForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  private get activeService() {
    return this.mode() === 'admin' ? this.authService : this.customerAuthService;
  }

  sendOtp(): void {
    if (this.mobileForm.invalid || this.submitting()) {
      this.mobileForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.activeService.sendOtp(this.mobileForm.getRawValue().mobile).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.step.set('otp');
        this.devCode.set(res.devCode ?? null);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Could not send an OTP to that number. Please check it and try again.');
      },
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid || this.submitting()) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    const mobile = this.mobileForm.getRawValue().mobile;
    const code = this.otpForm.getRawValue().code;

    this.activeService.verifyOtp(mobile, code).subscribe({
      next: () => {
        this.submitting.set(false);
        const fallback = this.mode() === 'admin' ? '/admin' : '/account';
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? fallback;
        this.router.navigateByUrl(redirectTo);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Incorrect or expired OTP. Please try again.');
      },
    });
  }

  changeMobile(): void {
    this.step.set('mobile');
    this.otpForm.reset();
    this.errorMessage.set(null);
    this.devCode.set(null);
  }
}
