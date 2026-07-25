import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, CheckCircle2, LogOut } from 'lucide-angular';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

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

  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: [this.customerAuthService.currentUser()?.name ?? '', [Validators.required, Validators.minLength(2)]],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.customerAuthService.updateProfile(this.form.getRawValue().name).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: () => this.saving.set(false),
    });
  }

  logout(): void {
    this.customerAuthService.logout();
    this.router.navigateByUrl('/');
  }
}
