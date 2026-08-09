import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Store, IndianRupee, Clock } from 'lucide-angular';
import { SeoService } from '../../core/services/seo.service';

interface ConfirmationState {
  estimatedTotal?: number;
  pickupDate?: string;
  pickupTime?: string;
}

/**
 * Post-checkout screen. Orders are enquiries rather than paid transactions —
 * online payment was withdrawn following the 2018 Supreme Court restrictions on
 * firecracker sales — so this confirms receipt and tells the customer staff will
 * be in touch, with payment collected in cash at pickup.
 */
@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DatePipe],
  templateUrl: './order-confirmation.html',
})
export class OrderConfirmation {
  private readonly route = inject(ActivatedRoute);

  readonly StoreIcon = Store;
  readonly IndianRupeeIcon = IndianRupee;
  readonly ClockIcon = Clock;

  readonly orderNumber = this.route.snapshot.paramMap.get('orderNumber') ?? '';

  // Passed via router navigation state from checkout — not persisted, so a hard
  // refresh loses the detail (the order number still shows, from the URL).
  private readonly state = (history.state ?? {}) as ConfirmationState;

  readonly pickupDate = this.state.pickupDate ?? null;
  readonly pickupTime = this.state.pickupTime ?? null;

  readonly displayAmount = computed(() => this.state.estimatedTotal ?? null);

  constructor() {
    inject(SeoService).update({
      title: 'Order Received | Surya Crackers',
      description: 'Your Surya Crackers order has been received and is on hold pending confirmation by our team.',
      path: '/order-confirmation',
      robots: 'noindex,nofollow',
    });
  }
}
