import { Component, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LucideAngularModule, ImagePlus, Upload, TriangleAlert, ClipboardPaste } from 'lucide-angular';
import { UploadService, UploadedImage } from '../../../core/services/upload.service';
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
  readonly ClipboardPasteIcon = ClipboardPaste;

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

    this.uploadFile(file);
    input.value = '';
  }

  /**
   * Ctrl+V into the paste zone. Handles the actual image on the clipboard —
   * a screenshot, or "Copy image" from WhatsApp or a browser. Copied *links*
   * are not imported here; use the URL box below for those.
   */
  onPaste(event: ClipboardEvent): void {
    if (this.disabled || this.uploading()) {
      return;
    }
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return;
    }

    const imageFile = Array.from(clipboard.files).find((file) => file.type.startsWith('image/'));
    if (imageFile) {
      event.preventDefault();
      this.uploadFile(imageFile);
      return;
    }

    if (clipboard.getData('text/plain').trim()) {
      event.preventDefault();
      this.error.set('That is text, not an image. Right-click the image itself and choose "Copy image".');
    }
  }

  /** Toolbar button — reads the clipboard directly where the browser allows it. */
  async pasteFromClipboard(): Promise<void> {
    if (this.disabled || this.uploading()) {
      return;
    }
    this.error.set(null);

    if (!navigator.clipboard?.read) {
      this.error.set('This browser blocks clipboard reads — click the paste box and press Ctrl+V instead.');
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          this.uploadFile(new File([blob], `pasted.${imageType.split('/')[1] ?? 'png'}`, { type: imageType }));
          return;
        }
      }
      this.error.set('Clipboard has no image. Right-click an image and choose "Copy image" first.');
    } catch {
      this.error.set('Could not read the clipboard — click the paste box and press Ctrl+V instead.');
    }
  }

  private uploadFile(file: File): void {
    const invalid = this.uploadService.validate(file);
    if (invalid) {
      this.error.set(invalid);
      return;
    }
    this.run(this.uploadService.upload(file));
  }

  private run(request: Observable<UploadedImage>): void {
    this.uploading.set(true);
    this.error.set(null);

    request.subscribe({
      next: (uploaded) => {
        this.uploading.set(false);
        this.value = uploaded.url;
        this.onChange(uploaded.url);
        this.onTouched();
      },
      error: (err: unknown) => {
        this.uploading.set(false);
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
