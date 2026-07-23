import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ShoppingCart, Sparkles } from 'lucide-angular';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './product-card.html',
})
export class ProductCard {
  readonly product = input.required<Product>();

  private readonly cartService = inject(CartService);

  readonly ShoppingCartIcon = ShoppingCart;
  readonly SparklesIcon = Sparkles;

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addToCart(this.product());
  }
}
