import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Flame, ShoppingCart, Search, MessageCircle, X } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './header.html',
})
export class Header {
  readonly cartService = inject(CartService);
  readonly catalogService = inject(CatalogService);
  private readonly router = inject(Router);

  readonly FlameIcon = Flame;
  readonly ShoppingCartIcon = ShoppingCart;
  readonly SearchIcon = Search;
  readonly MessageCircleIcon = MessageCircle;
  readonly XIcon = X;

  readonly searchOpen = signal(false);
  readonly searchTerm = signal('');

  toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  submitSearch(): void {
    const q = this.searchTerm().trim();
    this.router.navigate(['/'], { queryParams: q ? { q } : {} });
    this.searchOpen.set(false);
  }

  openWhatsApp(): void {
    const number = this.catalogService.footerConfig().whatsappNumber;
    if (number) {
      window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
    }
  }
}
