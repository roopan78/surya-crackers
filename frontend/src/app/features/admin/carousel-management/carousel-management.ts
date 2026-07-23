import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, ArrowUp, ArrowDown } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';
import { CarouselBanner } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';

@Component({
  selector: 'app-carousel-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField],
  templateUrl: './carousel-management.html',
})
export class CarouselManagement {
  readonly catalogService = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly ArrowUpIcon = ArrowUp;
  readonly ArrowDownIcon = ArrowDown;

  readonly editingId = signal<string | null>(null);

  readonly sortedBanners = computed(() =>
    [...this.catalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    subtitle: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]],
    sortOrder: [1, [Validators.required, Validators.min(1)]],
  });

  startEdit(banner: CarouselBanner): void {
    this.editingId.set(banner.id);
    this.form.setValue({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      sortOrder: banner.sortOrder,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    const nextSortOrder = this.catalogService.banners().length + 1;
    this.form.reset({ title: '', subtitle: '', imageUrl: '', sortOrder: nextSortOrder });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();

    if (editingId) {
      this.catalogService.updateBanner(editingId, value);
    } else {
      this.catalogService.addBanner({ id: crypto.randomUUID(), ...value });
    }

    this.cancelEdit();
  }

  deleteBanner(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.catalogService.deleteBanner(id);
  }

  moveUp(banner: CarouselBanner): void {
    this.catalogService.updateBanner(banner.id, { sortOrder: banner.sortOrder - 1.5 });
    this.normalizeSortOrders();
  }

  moveDown(banner: CarouselBanner): void {
    this.catalogService.updateBanner(banner.id, { sortOrder: banner.sortOrder + 1.5 });
    this.normalizeSortOrders();
  }

  private normalizeSortOrders(): void {
    const ordered = [...this.catalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder);
    ordered.forEach((banner, index) => {
      const normalized = index + 1;
      if (banner.sortOrder !== normalized) {
        this.catalogService.updateBanner(banner.id, { sortOrder: normalized });
      }
    });
  }
}
