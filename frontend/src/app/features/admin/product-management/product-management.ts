import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, Star } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';
import { Product } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField, ToggleSwitch],
  templateUrl: './product-management.html',
})
export class ProductManagement {
  readonly catalogService = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly StarIcon = Star;

  readonly editingId = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categorySlug: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    boxQuantity: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]],
    videoUrl: [''],
    safetyInstructions: ['', [Validators.required, Validators.minLength(10)]],
    isFeatured: [false],
  });

  startEdit(product: Product): void {
    this.editingId.set(product.id);
    this.form.setValue({
      name: product.name,
      categorySlug: product.categorySlug,
      price: product.price,
      boxQuantity: product.boxQuantity,
      imageUrl: product.imageUrl,
      videoUrl: product.videoUrl ?? '',
      safetyInstructions: product.safetyInstructions,
      isFeatured: product.isFeatured,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      categorySlug: '',
      price: 0,
      boxQuantity: '',
      imageUrl: '',
      videoUrl: '',
      safetyInstructions: '',
      isFeatured: false,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();

    if (editingId) {
      this.catalogService.updateProduct(editingId, value);
    } else {
      this.catalogService.addProduct({ id: crypto.randomUUID(), ...value });
    }

    this.cancelEdit();
  }

  deleteProduct(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.catalogService.deleteProduct(id);
  }

  categoryName(slug: string): string {
    return this.catalogService.categories().find((c) => c.slug === slug)?.name ?? slug;
  }
}
