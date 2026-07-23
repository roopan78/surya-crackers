import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, CheckCircle2 } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-footer-configuration',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './footer-configuration.html',
})
export class FooterConfiguration {
  private readonly catalogService = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly SaveIcon = Save;
  readonly CheckCircle2Icon = CheckCircle2;

  readonly saved = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    shopName: [this.catalogService.footerConfig().shopName, [Validators.required]],
    address: [this.catalogService.footerConfig().address, [Validators.required]],
    licenseNumber: [this.catalogService.footerConfig().licenseNumber, [Validators.required]],
    phone: [this.catalogService.footerConfig().phone, [Validators.required]],
    whatsappNumber: [
      this.catalogService.footerConfig().whatsappNumber,
      [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)],
    ],
    safetyDisclaimer: [this.catalogService.footerConfig().safetyDisclaimer, [Validators.required, Validators.minLength(20)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.catalogService.updateFooterConfig(this.form.getRawValue());
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
