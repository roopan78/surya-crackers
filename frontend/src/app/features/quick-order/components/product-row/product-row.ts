import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, ImageOff, Check } from 'lucide-angular';
import { Product } from '../../../../core/models';
import { QuantityStepper } from '../../../../shared/components/quantity-stepper/quantity-stepper';
import { CdnImagePipe } from '../../../../shared/pipes/cdn-image.pipe';

/**
 * One orderable line in the Quick Order table. Purely presentational: quantity
 * comes in as a signal input and changes go back out as events, so the row
 * never touches cart state itself and stays cheap to render in long lists.
 */
@Component({
  selector: 'app-product-row',
  standalone: true,
  imports: [LucideAngularModule, QuantityStepper, CdnImagePipe],
  templateUrl: './product-row.html',
})
export class ProductRow {
  readonly product = input.required<Product>();
  readonly quantity = input.required<number>();

  readonly increment = output<void>();
  readonly decrement = output<void>();
  /** Absolute quantity typed into the stepper. */
  readonly quantityChange = output<number>();

  readonly ImageOffIcon = ImageOff;
  readonly CheckIcon = Check;

  readonly subtotal = computed(() => this.product().price * this.quantity());
  readonly inOrder = computed(() => this.quantity() > 0);

  /** Only strike through an MRP that is genuinely above the selling price. */
  readonly showOriginalPrice = computed(() => {
    const original = this.product().originalPrice;
    return original != null && original > this.product().price;
  });

  readonly outOfStock = computed(() => this.product().stockCount <= 0);
}
