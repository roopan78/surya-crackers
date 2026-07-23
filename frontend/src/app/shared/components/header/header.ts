import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Flame, ShoppingCart } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './header.html',
})
export class Header {
  readonly cartService = inject(CartService);

  readonly FlameIcon = Flame;
  readonly ShoppingCartIcon = ShoppingCart;
}
