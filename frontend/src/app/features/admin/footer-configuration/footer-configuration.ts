import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, CheckCircle2 } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-footer-configuration',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './footer-configuration.html',
})
export class FooterConfiguration implements OnInit {
  private readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly SaveIcon = Save;
  readonly CheckCircle2Icon = CheckCircle2;

  readonly saved = signal(false);
  readonly saving = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    shopName: ['', [Validators.required]],
    address: ['', [Validators.required]],
    licenseNumber: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    safetyDisclaimer: ['', [Validators.required, Validators.minLength(20)]],
  });

  ngOnInit(): void {
    this.adminCatalogService.getFooterConfig().subscribe({
      next: (config) => {
        if (config) {
          this.form.setValue(config);
        }
      },
      error: () => this.toastService.error('Could not load the current footer configuration.'),
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    this.adminCatalogService.updateFooterConfig(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.toastService.success('Footer configuration saved.');
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: () => {
        this.saving.set(false);
        this.toastService.error('Could not save the footer configuration — please try again.');
      },
    });
  }
}
