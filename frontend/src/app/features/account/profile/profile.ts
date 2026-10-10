import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { LucideAngularModule, Save, CheckCircle2, LogOut, KeyRound, TriangleAlert } from 'lucide-angular';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile.html',
})
export class Profile {
  readonly customerAuthService = inject(CustomerAuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly SaveIcon = Save;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly LogOutIcon = LogOut;
  readonly KeyRoundIcon = KeyRound;
  readonly TriangleAlertIcon = TriangleAlert;

  private readonly seoService = inject(SeoService);

  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly changingPassword = signal(false);
  readonly passwordChanged = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: [this.customerAuthService.currentUser()?.name ?? '', [Validators.required, Validators.minLength(2)]],
    mobile: [this.customerAuthService.currentUser()?.mobile ?? '', [Validators.pattern(/^[0-9]{10}$/)]],
  });

  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.seoService.update({
      title: 'My Profile | Surya Crackers',
      description: 'Manage your Surya Crackers account details.',
      path: '/account',
      robots: 'noindex,follow',
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { name, mobile } = this.form.getRawValue();
    this.customerAuthService.updateProfile({ name, mobile: mobile || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: () => this.saving.set(false),
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.changingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword.set(true);
    this.passwordError.set(null);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.customerAuthService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordChanged.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordChanged.set(false), 4000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.changingPassword.set(false);
        this.passwordError.set(err.error?.message ?? 'Could not change your password. Please try again.');
      },
    });
  }

  logout(): void {
    this.customerAuthService.logout();
    this.router.navigateByUrl('/');
  }
}

/** Group-level check — the confirmation box has to match the new password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return !confirmPassword || newPassword === confirmPassword ? null : { passwordMismatch: true };
}
