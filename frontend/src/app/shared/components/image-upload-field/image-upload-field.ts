import { Component, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule, ImagePlus, Upload, TriangleAlert } from 'lucide-angular';
import { UploadService } from '../../../core/services/upload.service';
import { cdnImage } from '../../utils/cloudinary.util';

/**
 * Reusable image field for Admin forms: picks a file, uploads it straight to
 * Cloudinary (browser -> Cloudinary, signed by our API) and stores the returned
 * URL — never the image bytes. A manual URL box remains for images already
 * hosted elsewhere. Implements ControlValueAccessor so it binds with
 * `formControlName` like any other field.
 */
@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './image-upload-field.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadField),
      multi: true,
    },
  ],
})
export class ImageUploadField implements ControlValueAccessor {
  readonly label = input('Image');

  private readonly uploadService = inject(UploadService);

  value = '';
  disabled = false;

  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly ImagePlusIcon = ImagePlus;
  readonly UploadIcon = Upload;
  readonly TriangleAlertIcon = TriangleAlert;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  /** Small preview variant — no need to pull the full-size original here. */
  get previewUrl(): string {
    return cdnImage(this.value, 160);
  }

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onUrlInput(value: string): void {
    this.value = value;
    this.error.set(null);
    this.onChange(value);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const invalid = this.uploadService.validate(file);
    if (invalid) {
      this.error.set(invalid);
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.error.set(null);

    this.uploadService.upload(file).subscribe({
      next: (uploaded) => {
        this.uploading.set(false);
        this.value = uploaded.url;
        this.onChange(uploaded.url);
        this.onTouched();
        input.value = '';
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        input.value = '';
        const message =
          err instanceof HttpErrorResponse && typeof err.error?.message === 'string'
            ? err.error.message
            : err instanceof Error
              ? err.message
              : 'Upload failed — please try again.';
        this.error.set(message);
      },
    });
  }
}
