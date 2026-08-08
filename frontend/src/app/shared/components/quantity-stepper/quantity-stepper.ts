import { Component, input, output } from '@angular/core';
import { LucideAngularModule, Minus, Plus } from 'lucide-angular';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './quantity-stepper.html',
})
export class QuantityStepper {
  readonly quantity = input.required<number>();
  readonly disableDecrement = input(false);
  /**
   * Renders the value as a number input so a quantity can be typed instead of
   * clicked up one at a time. Off by default, so existing steppers keep their
   * read-only display.
   */
  readonly editable = input(false);
  readonly ariaLabel = input('Quantity');

  readonly increment = output<void>();
  readonly decrement = output<void>();
  /** Emitted only in editable mode, with a sanitized non-negative integer. */
  readonly quantityChange = output<number>();

  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;

  /** Keeps typed input to whole, non-negative numbers without fighting the caret. */
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (digits !== input.value) {
      input.value = digits;
    }
    this.quantityChange.emit(digits ? Number(digits) : 0);
  }

  /** An emptied field means zero — restore the displayed value on blur. */
  onBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      input.value = String(this.quantity());
      this.quantityChange.emit(0);
    }
  }
}
