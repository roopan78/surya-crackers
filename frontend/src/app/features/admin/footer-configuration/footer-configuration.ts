import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, CheckCircle2, Plus, Trash2 } from 'lucide-angular';
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
  readonly PlusIcon = Plus;
  readonly Trash2Icon = Trash2;

  readonly saved = signal(false);
  readonly saving = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    shopName: ['', [Validators.required]],
    // One group per branch — the storefront renders each as its own block, and
    // the flagged one is the address published in the structured data.
    addresses: this.formBuilder.nonNullable.array([this.newAddressGroup()]),
    licenseNumber: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    // Optional — leave blank to hide the icon in the storefront footer.
    instagramUrl: ['', [Validators.pattern(/^https:\/\/.+/)]],
    facebookUrl: ['', [Validators.pattern(/^https:\/\/.+/)]],
    safetyDisclaimer: ['', [Validators.required, Validators.minLength(20)]],
  });

  get addresses() {
    return this.form.controls.addresses;
  }

  private newAddressGroup(address = '', isPrimary = false) {
    return this.formBuilder.nonNullable.group({
      address: [address, [Validators.required]],
      isPrimary: [isPrimary],
    });
  }

  addAddress(): void {
    // First address added is primary by default, so SEO always has a location.
    this.addresses.push(this.newAddressGroup('', this.addresses.length === 0));
  }

  /** The last address is kept: the storefront needs at least one. */
  removeAddress(index: number): void {
    const wasPrimary = this.addresses.at(index).controls.isPrimary.value;
    if (this.addresses.length > 1) {
      this.addresses.removeAt(index);
      // Removing the primary would leave SEO without an address — promote the first.
      if (wasPrimary) {
        this.setPrimary(0);
      }
    } else {
      this.addresses.at(0).patchValue({ address: '', isPrimary: true });
    }
  }

  /** Exactly one branch can be primary; selecting one clears the rest. */
  setPrimary(index: number): void {
    this.addresses.controls.forEach((group: FormGroup, i: number) =>
      group.controls['isPrimary'].setValue(i === index),
    );
  }

  ngOnInit(): void {
    this.adminCatalogService.getFooterConfig().subscribe({
      next: (config) => {
        if (config) {
          // A FormArray has to be resized to match the payload before patching,
          // otherwise extra saved addresses are silently dropped.
          const saved = config.addresses?.length ? config.addresses : [{ address: '', isPrimary: true }];
          this.addresses.clear();
          saved.forEach((entry, index) =>
            this.addresses.push(this.newAddressGroup(entry.address, entry.isPrimary || index === 0 && !saved.some((e) => e.isPrimary))),
          );

          // patchValue (not setValue) so a config payload missing newly added
          // optional fields can never throw and blank the whole form.
          this.form.patchValue(config);
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
