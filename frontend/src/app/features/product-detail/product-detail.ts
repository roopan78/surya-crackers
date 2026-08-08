import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule, ShieldAlert, PackageCheck, ShoppingCart } from 'lucide-angular';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { RecentlyViewedService } from '../../core/services/recently-viewed.service';
import { SeoService } from '../../core/services/seo.service';
import { Product } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { YoutubeEmbedPipe } from '../../shared/pipes/youtube-embed.pipe';
import { CdnImagePipe } from '../../shared/pipes/cdn-image.pipe';

const SUGGESTION_LIMIT = 4;

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, ProductCard, QuantityStepper, YoutubeEmbedPipe, CdnImagePipe, TitleCasePipe],
  templateUrl: './product-detail.html',
})
export class ProductDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);
  private readonly recentlyViewedService = inject(RecentlyViewedService);
  private readonly seoService = inject(SeoService);

  /** Route param carries a slug for new links and an id for older ones. */
  private readonly productKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  readonly product = computed(() => this.catalogService.getProductByIdOrSlug(this.productKey()));
  readonly boxesToAdd = signal(1);
  readonly justAdded = signal(false);

  readonly category = computed(() => {
    const product = this.product();
    return product ? this.catalogService.categories().find((c) => c.slug === product.categorySlug) : undefined;
  });

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
    // (Guarded for SSR readiness: there is no viewport to scroll on the server.)
    effect(() => {
      this.productKey();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Per-product SEO: metadata + Product/Breadcrumb structured data. Re-runs
    // when the async catalog resolves and on product-to-product navigation.
    effect(() => {
      const product = this.product();
      if (!product) {
        // The catalog is a static SPA, so a deleted product's URL still answers
        // 200 with a "not found" view — a soft 404. Once the catalog has loaded
        // and the slug still doesn't resolve, mark it noindex so search engines
        // drop the URL instead of indexing an empty page.
        if (!this.catalogService.loading() && !this.catalogService.loadError()) {
          this.seoService.update({
            title: 'Product Not Found | Surya Crackers',
            description: 'This product is no longer available. Browse the full Surya Crackers range instead.',
            path: `/product/${this.productKey()}`,
            robots: 'noindex,follow',
          });
          this.seoService.setJsonLd('product', null);
          this.seoService.setJsonLd('breadcrumb', null);
        }
        return;
      }
      const category = this.category();
      const path = `/product/${product.slug}`;

      this.seoService.update({
        title:
          product.name.length <= 32
            ? `Buy ${product.name} Online | Surya Crackers`
            : `${product.name} | Surya Crackers`,
        description: `Buy premium ${product.name} online at the best price from Surya Crackers. Order today.`,
        keywords: [product.name, category?.name, 'crackers online', 'sivakasi fireworks']
          .filter(Boolean)
          .join(', '),
        path,
        image: product.imageUrl || undefined,
        imageAlt: product.name,
        type: 'product',
      });

      // Offers need a concrete expiry; roll it forward ~30 days on each render.
      const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      this.seoService.setJsonLd('product', {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        sku: product.sku,
        url: `https://suryacrackers.shop${path}`,
        ...(product.imageUrl ? { image: product.imageUrl } : {}),
        description: `${product.name} (${product.boxQuantity}) from Surya Crackers.`,
        brand: { '@type': 'Brand', name: 'Surya Crackers' },
        offers: {
          '@type': 'Offer',
          url: `https://suryacrackers.shop${path}`,
          price: product.price,
          priceCurrency: 'INR',
          priceValidUntil,
          itemCondition: 'https://schema.org/NewCondition',
          availability:
            product.stockCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'Surya Crackers' },
        },
      });

      this.seoService.setJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://suryacrackers.shop/' },
          ...(category
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: category.name,
                  item: `https://suryacrackers.shop/category/${category.slug}`,
                },
              ]
            : []),
          { '@type': 'ListItem', position: category ? 3 : 2, name: product.name },
        ],
      });
    });
  }

  ngOnDestroy(): void {
    this.seoService.setJsonLd('product', null);
    this.seoService.setJsonLd('breadcrumb', null);
  }

  readonly ShieldAlertIcon = ShieldAlert;
  readonly PackageCheckIcon = PackageCheck;
  readonly ShoppingCartIcon = ShoppingCart;

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
