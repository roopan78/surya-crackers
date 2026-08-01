import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule, ShieldAlert, PackageCheck, ShoppingCart, ArrowLeft } from 'lucide-angular';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { RecentlyViewedService } from '../../core/services/recently-viewed.service';
import { Product } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { YoutubeEmbedPipe } from '../../shared/pipes/youtube-embed.pipe';

const SUGGESTION_LIMIT = 4;

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, ProductCard, QuantityStepper, YoutubeEmbedPipe, TitleCasePipe],
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);
  private readonly recentlyViewedService = inject(RecentlyViewedService);

  /** Route param carries a slug for new links and an id for older ones. */
  private readonly productKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  readonly product = computed(() => this.catalogService.getProductByIdOrSlug(this.productKey()));
  readonly boxesToAdd = signal(1);
  readonly justAdded = signal(false);

  /** Same-category products first, topped up from the rest of the catalog. */
  readonly relatedProducts = computed<Product[]>(() => {
    const current = this.product();
    if (!current) {
      return [];
    }
    const others = this.catalogService.products().filter((p) => p.id !== current.id);
    const sameCategory = others.filter((p) => p.categorySlug === current.categorySlug);
    const fillers = others.filter((p) => p.categorySlug !== current.categorySlug);
    return [...sameCategory, ...fillers].slice(0, SUGGESTION_LIMIT);
  });

  /** Previously opened products (excluding this one), resolved against the live catalog. */
  readonly recentlyViewed = computed<Product[]>(() => {
    const currentId = this.product()?.id;
    const catalog = this.catalogService.products();
    return this.recentlyViewedService
      .ids()
      .filter((id) => id !== currentId)
      .map((id) => catalog.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined)
      .slice(0, SUGGESTION_LIMIT);
  });

  constructor() {
    // Record every viewed product (also re-fires once the async catalog resolves).
    effect(() => {
      const product = this.product();
      if (product) {
        this.recentlyViewedService.record(product.id);
      }
    });

    // Product-to-product navigation reuses this component, so the router alone
    // won't reset the viewport — scroll to top whenever the route param changes.
    effect(() => {
      this.productKey();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  readonly ShieldAlertIcon = ShieldAlert;
  readonly PackageCheckIcon = PackageCheck;
  readonly ShoppingCartIcon = ShoppingCart;
  readonly ArrowLeftIcon = ArrowLeft;

  incrementBoxesToAdd(): void {
    this.boxesToAdd.update((n) => n + 1);
  }

  decrementBoxesToAdd(): void {
    this.boxesToAdd.update((n) => Math.max(1, n - 1));
  }

  addToCart(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    this.cartService.addToCart(product, this.boxesToAdd());
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 2000);
  }
}
