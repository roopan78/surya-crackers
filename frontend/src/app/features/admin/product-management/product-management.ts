import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, Star } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { Product } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';
import { slugify } from '../../../shared/utils/slugify.util';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField, ToggleSwitch],
  templateUrl: './product-management.html',
})
export class ProductManagement implements OnInit {
  readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly StarIcon = Star;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    price: [0, [Validators.required, Validators.min(1)]],
    boxQuantity: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]],
    videoUrl: [''],
    safetyInstructions: ['', [Validators.required, Validators.minLength(10)]],
    isFeatured: [false],
    isActive: [true],
    stockCount: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.adminCatalogService.loadCategories();
    this.adminCatalogService.loadProducts();
  }

  onNameInput(name: string): void {
    if (!this.editingId()) {
      const slug = slugify(name);
      this.form.controls.slug.setValue(slug);
      this.form.controls.sku.setValue(slug ? slug.toUpperCase() : '');
    }
  }

  startEdit(product: Product): void {
    this.editingId.set(product.id);
    this.errorMessage.set(null);
    const category = this.adminCatalogService.categories().find((c) => c.slug === product.categorySlug);
    this.form.setValue({
      name: product.name,
      categoryId: category?.id ?? '',
      sku: product.sku,
      slug: product.slug,
      price: product.price,
      boxQuantity: product.boxQuantity,
      imageUrl: product.imageUrl,
      videoUrl: product.videoUrl ?? '',
      safetyInstructions: product.safetyInstructions,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      stockCount: product.stockCount,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      name: '',
      categoryId: '',
      sku: '',
      slug: '',
      price: 0,
      boxQuantity: '',
      imageUrl: '',
      videoUrl: '',
      safetyInstructions: '',
      isFeatured: false,
      isActive: true,
      stockCount: 0,
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name,
      sku: value.sku,
      slug: value.slug,
      categoryId: value.categoryId,
      price: value.price,
      boxQuantity: value.boxQuantity,
      imageUrls: [value.imageUrl],
      videoUrl: value.videoUrl,
      safetyInstructions: value.safetyInstructions,
      isFeatured: value.isFeatured,
      isActive: value.isActive,
      stockCount: value.stockCount,
    };
    const editingId = this.editingId();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = editingId
      ? this.adminCatalogService.updateProduct(editingId, payload)
      : this.adminCatalogService.createProduct(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not save this product — check the SKU/slug are unique and try again.');
      },
    });
  }

  deleteProduct(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.adminCatalogService.deleteProduct(id).subscribe({
      error: () => this.errorMessage.set('Could not delete this product — please try again.'),
    });
  }

  categoryName(slug: string): string {
    return this.adminCatalogService.categories().find((c) => c.slug === slug)?.name ?? slug;
  }
}
