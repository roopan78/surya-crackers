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

  readonly increment = output<void>();
  readonly decrement = output<void>();

  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;
}
