import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X } from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { Category } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { ToggleSwitch } from '../../../shared/components/toggle-switch/toggle-switch';
import { slugify } from '../../../shared/utils/slugify.util';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField, ToggleSwitch],
  templateUrl: './category-management.html',
})
export class CategoryManagement implements OnInit {
  readonly adminCatalogService = inject(AdminCatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
    this.errorMessage.set(null);
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
    this.errorMessage.set(null);
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
    this.errorMessage.set(null);

    const request = editingId
      ? this.adminCatalogService.updateCategory(editingId, payload)
      : this.adminCatalogService.createCategory(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not save this category — please try again.');
      },
    });
  }

  deleteCategory(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.adminCatalogService.deleteCategory(id).subscribe({
      error: () => this.errorMessage.set('Could not delete this category — it may still have products assigned.'),
    });
  }
}
