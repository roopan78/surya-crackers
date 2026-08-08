import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, Star, Search, Download } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { Product, ProductImportResult } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ToastService } from '../../../shared/services/toast.service';
import { slugify } from '../../../shared/utils/slugify.util';
import { ProductImportModal } from './product-import-modal/product-import-modal';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule,
    ImageUploadField,
    ToggleSwitch,
    ConfirmModal,
    ProductImportModal,
  ],
  templateUrl: './product-management.html',
})
export class ProductManagement implements OnInit {
  readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly StarIcon = Star;
  readonly SearchIcon = Search;

  readonly DownloadIcon = Download;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly searchTerm = signal('');
  readonly pendingDelete = signal<Product | null>(null);
  readonly importOpen = signal(false);

  readonly filteredProducts = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const products = this.adminCatalogService.products();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
  });

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    price: [0, [Validators.required, Validators.min(1)]],
    // Optional MRP; blank means "not discounted" and stores null.
    originalPrice: [null as number | null],
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
    const category = this.adminCatalogService.categories().find((c) => c.slug === product.categorySlug);
    this.form.setValue({
      name: product.name,
      categoryId: category?.id ?? '',
      sku: product.sku,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
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
    this.form.reset({
      name: '',
      categoryId: '',
      sku: '',
      slug: '',
      price: 0,
      originalPrice: null,
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
      // Empty input arrives as null/'' — normalize so "no MRP" is stored as null.
      originalPrice: value.originalPrice ? Number(value.originalPrice) : null,
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

    const request = editingId
      ? this.adminCatalogService.updateProduct(editingId, payload)
      : this.adminCatalogService.createProduct(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success(editingId ? 'Product updated.' : 'Product added.');
        this.cancelEdit();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.error('Could not save this product — check the SKU/slug are unique and try again.');
      },
    });
  }

  confirmDelete(): void {
    const product = this.pendingDelete();
    if (!product) return;

    if (this.editingId() === product.id) {
      this.cancelEdit();
    }
    this.adminCatalogService.deleteProduct(product.id).subscribe({
      next: () => this.toastService.success('Product deleted.'),
      error: () => this.toastService.error('Could not delete this product — please try again.'),
    });
    this.pendingDelete.set(null);
  }

  categoryName(slug: string): string {
    return this.adminCatalogService.categories().find((c) => c.slug === slug)?.name ?? slug;
  }

  onImportCompleted(result: ProductImportResult): void {
    // The service already reloads products/categories and refreshes the storefront.
    this.toastService.success(
      `Import complete — ${result.createdProducts} created, ${result.updatedProducts} updated.`,
    );
  }
}
