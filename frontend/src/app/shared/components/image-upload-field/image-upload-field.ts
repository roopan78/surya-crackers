import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule, ImagePlus } from 'lucide-angular';
import { readFileAsDataUrl } from '../../utils/file-to-data-url.util';

/**
 * Reusable "image placeholder" field for Admin forms — a file picker
 * (previewed locally via a data URL, no backend/API involved) plus a
 * manual URL fallback. Implements ControlValueAccessor so it can be
 * bound with `formControlName` just like any other form field.
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

  value = '';
  disabled = false;

  readonly ImagePlusIcon = ImagePlus;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

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
    this.onChange(value);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    this.value = dataUrl;
    this.onChange(dataUrl);
    this.onTouched();
  }
}
