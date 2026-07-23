import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Pencil, Trash2, Plus, X } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';
import { Category } from '../../../core/models';
import { ImageUploadField } from '../../../shared/components/image-upload-field/image-upload-field';
import { slugify } from '../../../shared/utils/slugify.util';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ImageUploadField],
  templateUrl: './category-management.html',
})
export class CategoryManagement {
  readonly catalogService = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly PlusIcon = Plus;
  readonly XIcon = X;

  readonly editingId = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    image: ['', [Validators.required]],
  });

  onNameInput(name: string): void {
    // Keep slug in sync with name unless the admin has started editing an existing category.
    if (!this.editingId()) {
      this.form.controls.slug.setValue(slugify(name));
    }
  }

  startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.form.setValue({ name: category.name, slug: category.slug, image: category.image });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', slug: '', image: '' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();

    if (editingId) {
      this.catalogService.updateCategory(editingId, value);
    } else {
      this.catalogService.addCategory({ id: crypto.randomUUID(), ...value });
    }

    this.cancelEdit();
  }

  deleteCategory(id: string): void {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    this.catalogService.deleteCategory(id);
  }
}
