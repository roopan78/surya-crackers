import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X, Search } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { Category } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ToastService } from '../../../shared/services/toast.service';
import { slugify } from '../../../shared/utils/slugify.util';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, LucideAngularModule, ImageUploadField, ToggleSwitch, ConfirmModal],
  templateUrl: './category-management.html',
})
export class CategoryManagement implements OnInit {
  readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly SearchIcon = Search;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly searchTerm = signal('');
  readonly pendingDelete = signal<Category | null>(null);

  readonly filteredCategories = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const categories = this.adminCatalogService.categories();
    if (!query) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));
  });

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    description: [''],
    image: ['', [Validators.required]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.adminCatalogService.loadCategories();
  }

  onNameInput(name: string): void {
    // Keep slug in sync with name unless the admin has started editing an existing category.
    if (!this.editingId()) {
      this.form.controls.slug.setValue(slugify(name));
    }
  }

  startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.form.setValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', slug: '', description: '', image: '', isActive: true });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name,
      slug: value.slug,
      description: value.description,
      imagePath: value.image,
      isActive: value.isActive,
    };
    const editingId = this.editingId();

    this.saving.set(true);

    const request = editingId
      ? this.adminCatalogService.updateCategory(editingId, payload)
      : this.adminCatalogService.createCategory(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success(editingId ? 'Category updated.' : 'Category added.');
        this.cancelEdit();
      },
      error: () => {
        this.saving.set(false);
        this.toastService.error('Could not save this category — please try again.');
      },
    });
  }

  confirmDelete(): void {
    const category = this.pendingDelete();
    if (!category) return;

    if (this.editingId() === category.id) {
      this.cancelEdit();
    }
    this.adminCatalogService.deleteCategory(category.id).subscribe({
      next: () => this.toastService.success('Category deleted.'),
      error: () => this.toastService.error('Could not delete this category — it may still have products assigned.'),
    });
    this.pendingDelete.set(null);
  }
}
