import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Trash2, MessageCircle, ShoppingBag, TriangleAlert } from 'lucide-angular';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OrderService } from '../../core/services/order.service';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { buildWhatsAppOrderMessage, openWhatsAppOrder } from '../../shared/utils/whatsapp-order.util';
import { OrderDetails } from '../../core/models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, LucideAngularModule, QuantityStepper],
  templateUrl: './checkout.html',
})
export class Checkout {
  readonly cartService = inject(CartService);
  private readonly catalogService = inject(CatalogService);
  private readonly orderService = inject(OrderService);
  private readonly formBuilder = inject(FormBuilder);

  readonly Trash2Icon = Trash2;
  readonly MessageCircleIcon = MessageCircle;
  readonly ShoppingBagIcon = ShoppingBag;
  readonly TriangleAlertIcon = TriangleAlert;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly deliveryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    address: ['', [Validators.required, Validators.minLength(10)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{10,15}$/)]],
    targetDate: ['', [Validators.required]],
  });

  incrementItem(productId: string): void {
    this.cartService.incrementBoxes(productId);
  }

  decrementItem(productId: string): void {
    this.cartService.decrementBoxes(productId);
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  confirmOrderViaWhatsApp(): void {
    if (this.deliveryForm.invalid || this.cartService.isEmpty() || this.submitting()) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    const order: OrderDetails = this.deliveryForm.getRawValue();
    const items = this.cartService.items();
    const footerConfig = this.catalogService.footerConfig();

    this.submitting.set(true);
    this.submitError.set(null);

    this.orderService.createOrder(order, items).subscribe({
      next: () => {
        const message = buildWhatsAppOrderMessage(footerConfig.shopName, items, order, this.cartService.grandTotal());
        openWhatsAppOrder(footerConfig.whatsappNumber, message);
        this.cartService.clearCart();
        this.deliveryForm.reset();
        this.submitting.set(false);
      },
      error: () => {
        this.submitError.set('Could not record your order — please check your connection and try again.');
        this.submitting.set(false);
      },
    });
  }
}
