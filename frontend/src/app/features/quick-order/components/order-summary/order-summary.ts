import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ShoppingCart, Info } from 'lucide-angular';
import { CartService } from '../../../../core/services/cart.service';

/** Minimum order values quoted to customers, by destination. */
export const MIN_ORDER_TN = 3000;
export const MIN_ORDER_OTHER = 5000;

/**
 * Order totals, rendered either as the desktop sticky card or the compact
 * mobile bottom bar. Both read the same cart signals, so the two layouts can
 * never disagree about the total.
 */
@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './order-summary.html',
})
export class OrderSummary {
  /** Compact variant for the mobile sticky bar. */
  readonly compact = input(false);

  readonly cartService = inject(CartService);

  readonly ShoppingCartIcon = ShoppingCart;
  readonly InfoIcon = Info;

  readonly minOrderTn = MIN_ORDER_TN;
  readonly minOrderOther = MIN_ORDER_OTHER;

  /** Shortfall against the Tamil Nadu / Puducherry minimum, or 0 once met. */
  readonly amountToMinimum = computed(() => Math.max(0, MIN_ORDER_TN - this.cartService.grandTotal()));
}
