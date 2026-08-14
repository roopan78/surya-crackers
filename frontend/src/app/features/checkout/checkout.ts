import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule, Trash2, ShoppingBag, TriangleAlert, Store, Clock } from 'lucide-angular';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { CustomerAuthService } from '../../core/services/customer-auth.service';
import { SeoService } from '../../core/services/seo.service';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { OrderDetails, PaymentProviderType } from '../../core/models';

/**
 * The 2018 Supreme Court ruling bars selling firecrackers online, so checkout
 * takes no payment at all: the order is recorded on hold, staff confirm it over
 * the phone, and the customer settles in cash at the counter on pickup.
 */
const PICKUP_PAYMENT_PROVIDER: PaymentProviderType = 'CASH_ON_PICKUP';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, LucideAngularModule, QuantityStepper],
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  readonly customerAuthService = inject(CustomerAuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly Trash2Icon = Trash2;
  readonly ShoppingBagIcon = ShoppingBag;
  readonly TriangleAlertIcon = TriangleAlert;
  readonly StoreIcon = Store;
  readonly ClockIcon = Clock;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly pickupForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    pickupDate: [''],
    pickupTime: [''],
    notes: [''],
  });

  constructor() {
    inject(SeoService).update({
      title: 'Cart & Checkout | Surya Crackers',
      description: 'Review your cart and place your pickup order with Surya Crackers.',
      path: '/checkout',
      robots: 'noindex,follow',
    });
  }

  ngOnInit(): void {
    const user = this.customerAuthService.currentUser();
    if (user) {
      this.pickupForm.patchValue({ name: user.name ?? '', mobile: user.mobile ?? '' });
    }
  }

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

  placeOrder(): void {
    if (this.pickupForm.invalid || this.cartService.isEmpty() || this.submitting()) {
      this.pickupForm.markAllAsTouched();
      return;
    }

    const details: OrderDetails = this.pickupForm.getRawValue();
    const items = this.cartService.items();
    const isRegistered = this.customerAuthService.isAuthenticated();

    this.submitting.set(true);
    this.submitError.set(null);

    this.orderService.createOrder(details, items, PICKUP_PAYMENT_PROVIDER, isRegistered).subscribe({
      next: (result) => {
        this.cartService.clearCart();
        this.submitting.set(false);
        this.router.navigate(['/order-confirmation', result.orderNumber], {
          state: {
            estimatedTotal: result.estimatedTotal,
            paymentStatus: result.paymentStatus,
            paymentProvider: PICKUP_PAYMENT_PROVIDER,
            pickupDate: details.pickupDate,
            pickupTime: details.pickupTime,
          },
        });
      },
      error: (err: unknown) => {
        // Surface the server's own reason (e.g. an unavailable payment method).
        // Blaming the connection for every failure sent us hunting the wrong bug.
        const message =
          err instanceof HttpErrorResponse && typeof err.error?.message === 'string'
            ? err.error.message
            : 'Could not place your order — please check your connection and try again.';
        this.submitError.set(message);
        this.submitting.set(false);
      },
    });
  }
}
