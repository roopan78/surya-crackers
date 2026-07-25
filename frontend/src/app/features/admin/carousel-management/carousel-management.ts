import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, ArrowUp, ArrowDown } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { CarouselBanner } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';

@Component({
  selector: 'app-carousel-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField, ToggleSwitch],
  templateUrl: './carousel-management.html',
})
export class CarouselManagement implements OnInit {
  readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly ArrowUpIcon = ArrowUp;
  readonly ArrowDownIcon = ArrowDown;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly sortedBanners = computed(() =>
    [...this.adminCatalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    subtitle: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]],
    sortOrder: [1, [Validators.required, Validators.min(1)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.adminCatalogService.loadBanners();
  }

  startEdit(banner: CarouselBanner): void {
    this.editingId.set(banner.id);
    this.errorMessage.set(null);
    this.form.setValue({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
    const nextSortOrder = this.adminCatalogService.banners().length + 1;
    this.form.reset({ title: '', subtitle: '', imageUrl: '', sortOrder: nextSortOrder, isActive: true });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = editingId
      ? this.adminCatalogService.updateBanner(editingId, value)
      : this.adminCatalogService.createBanner(value);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not save this banner — please try again.');
      },
    });
  }

  deleteBanner(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.adminCatalogService.deleteBanner(id).subscribe({
      error: () => this.errorMessage.set('Could not delete this banner — please try again.'),
    });
  }

  moveUp(banner: CarouselBanner): void {
    const ordered = this.sortedBanners();
    const index = ordered.findIndex((b) => b.id === banner.id);
    if (index <= 0) {
      return;
    }
    this.swapSortOrder(banner, ordered[index - 1]);
  }

  moveDown(banner: CarouselBanner): void {
    const ordered = this.sortedBanners();
    const index = ordered.findIndex((b) => b.id === banner.id);
    if (index === -1 || index >= ordered.length - 1) {
      return;
    }
    this.swapSortOrder(banner, ordered[index + 1]);
  }

  private swapSortOrder(a: CarouselBanner, b: CarouselBanner): void {
    this.adminCatalogService.updateBanner(a.id, { sortOrder: b.sortOrder }).subscribe();
    this.adminCatalogService.updateBanner(b.id, { sortOrder: a.sortOrder }).subscribe();
  }
}
