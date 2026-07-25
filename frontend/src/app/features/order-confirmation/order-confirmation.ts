import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, CircleCheck, Store, IndianRupee } from 'lucide-angular';

interface ConfirmationState {
  estimatedTotal?: number;
  paymentStatus?: string;
  pickupDate?: string;
  pickupTime?: string;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DatePipe],
  templateUrl: './order-confirmation.html',
})
export class OrderConfirmation {
  private readonly route = inject(ActivatedRoute);

  readonly CircleCheckIcon = CircleCheck;
  readonly StoreIcon = Store;
  readonly IndianRupeeIcon = IndianRupee;

  readonly orderNumber = this.route.snapshot.paramMap.get('orderNumber') ?? '';

  // Passed via router navigation state from checkout — not persisted, so a
  // hard refresh of this page loses the detail (order number itself still
  // shows from the URL). Acceptable for a one-time "thanks" confirmation.
  private readonly state = (history.state ?? {}) as ConfirmationState;

  readonly estimatedTotal = this.state.estimatedTotal ?? null;
  readonly paymentStatus = this.state.paymentStatus ?? null;
  readonly pickupDate = this.state.pickupDate ?? null;
  readonly pickupTime = this.state.pickupTime ?? null;

  get paymentMessage(): string {
    if (this.paymentStatus === 'PAID') {
      return 'Payment received.';
    }
    return 'Pay in cash when you arrive to collect your order.';
  }
}
