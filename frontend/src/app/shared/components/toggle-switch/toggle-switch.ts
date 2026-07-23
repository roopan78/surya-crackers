import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Boolean switch control that implements ControlValueAccessor so it can
 * be bound directly with `formControlName` inside Reactive Forms, e.g.
 * for the Product Addition Panel's "Featured Product" flag.
 */
@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  templateUrl: './toggle-switch.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitch),
      multi: true,
    },
  ],
})
export class ToggleSwitch implements ControlValueAccessor {
  readonly label = input<string>('');

  checked = false;
  disabled = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
  }
}
