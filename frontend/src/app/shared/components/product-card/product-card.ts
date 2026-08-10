import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ShoppingCart, Sparkles, Check } from 'lucide-angular';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { CdnImagePipe } from '../../pipes/cdn-image.pipe';
import { QuantityStepper } from '../quantity-stepper/quantity-stepper';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, CdnImagePipe, QuantityStepper],
  templateUrl: './product-card.html',
})
export class ProductCard {
  readonly product = input.required<Product>();

  private readonly cartService = inject(CartService);

  readonly ShoppingCartIcon = ShoppingCart;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = Check;

  /**
   * Read straight from cart state rather than a local copy, so a change made on
   * the cart page, product detail or Quick Order is reflected here immediately
   * and the card can never drift out of sync.
   */
  readonly quantity = computed(() => this.cartService.boxesByProductId().get(this.product().id) ?? 0);

  addToCart(event: Event): void {
    this.stopCardNavigation(event);
    this.cartService.addToCart(this.product());
  }

  increment(): void {
    this.cartService.incrementBoxes(this.product().id);
  }

  /** Drops the line entirely at 1 -> 0; never leaves a zero-quantity item. */
  decrement(): void {
    this.cartService.decrementBoxes(this.product().id);
  }

  /**
   * The whole card is an anchor, so a click on the controls would otherwise
   * navigate to the product page. stopPropagation alone is not enough — the
   * anchor's activation behaviour runs off the event path regardless — so the
   * default action has to be cancelled too.
   */
  stopCardNavigation(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
