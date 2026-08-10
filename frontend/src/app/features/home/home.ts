import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { HeroCarousel } from '../../shared/components/hero-carousel/hero-carousel';
import { CategoryPill } from '../../shared/components/category-pill/category-pill';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { SafetyNotice } from '../../shared/components/safety-notice/safety-notice';
import { FeaturedCategories } from '../../shared/components/featured-categories/featured-categories';
import { PromoBanner } from '../../shared/components/promo-banner/promo-banner';
import { WhyChooseUs } from '../../shared/components/why-choose-us/why-choose-us';
import { Testimonials } from '../../shared/components/testimonials/testimonials';
import { FaqAccordion } from '../../shared/components/faq-accordion/faq-accordion';
import { Category, Product } from '../../core/models';

const ALL_SLUG = 'all';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroCarousel,
    CategoryPill,
    ProductCard,
    SafetyNotice,
    FeaturedCategories,
    PromoBanner,
    WhyChooseUs,
    Testimonials,
    FaqAccordion,
  ],
  templateUrl: './home.html',
})
export class Home {
  private readonly catalogService = inject(CatalogService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly loading = this.catalogService.loading;
  readonly loadError = this.catalogService.loadError;

  readonly banners = computed(() =>
    [...this.catalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  readonly categories = this.catalogService.categories;
  readonly selectedSlug = signal<string>(ALL_SLUG);

  /** Verbatim `?q=` term — used for display so the heading echoes the user's own casing. */
  readonly searchQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('q') ?? '').trim())),
    { initialValue: '' },
  );

  /** Lowercased words of the query; every word must match for a product to qualify. */
  private readonly searchTokens = computed(() =>
    this.searchQuery().toLowerCase().split(/\s+/).filter(Boolean),
  );

  private readonly categoryNameBySlug = computed(
    () => new Map(this.catalogService.categories().map((c) => [c.slug, c.name])),
  );

  private readonly resultsSection = viewChild<ElementRef<HTMLElement>>('results');

  readonly featuredProducts = computed(() => this.catalogService.products().filter((p) => p.isFeatured));

  readonly visibleProducts = computed(() => {
    const tokens = this.searchTokens();
    let products = this.catalogService.products();

    // A search spans the whole catalogue. Intersecting it with whichever pill
    // the user happened to leave selected mostly yields an empty grid, which
    // reads as "search is broken".
    const slug = tokens.length > 0 ? ALL_SLUG : this.selectedSlug();
    if (slug !== ALL_SLUG) {
      products = products.filter((p) => p.categorySlug === slug);
    }
    if (tokens.length > 0) {
      products = products.filter((p) => {
        const haystack = this.searchHaystack(p);
        return tokens.every((token) => haystack.includes(token));
      });
    }
    return products;
  });

  readonly selectedCategoryName = computed(() => {
    const query = this.searchQuery();
    if (query) {
      return `Results for "${query}"`;
    }
    const slug = this.selectedSlug();
    if (slug === ALL_SLUG) {
      return 'Full Inventory';
    }
    return this.catalogService.categories().find((c) => c.slug === slug)?.name ?? 'Products';
  });

  readonly ALL_SLUG = ALL_SLUG;

  constructor() {
    // SEO: default homepage metadata, switching to a noindexed search-results
    // variant whenever ?q= is present. Canonical always stays the clean
    // homepage URL (query parameters are deliberately dropped), and the first
    // hero banner doubles as the social-share image once it loads.
    effect(() => {
      const query = this.searchQuery();
      const hero = this.banners()[0];
      const heroImage = hero
        ? { image: hero.imageUrl, imageAlt: hero.title }
        : {};

      if (query) {
        const label = query.length > 20 ? `${query.slice(0, 20)}…` : query;
        this.seoService.update({
          title: `Search Results for "${label}" | Surya Crackers`,
          description: `Browse search results for ${label} at Surya Crackers.`,
          path: '/',
          robots: 'noindex,follow',
          ...heroImage,
        });
      } else {
        this.seoService.update({
          title: 'Buy Crackers Online - Sivakasi Fireworks | Surya Crackers',
          description:
            'Buy premium Sivakasi crackers and fireworks online from Surya Crackers. Browse quality products and order online today.',
          keywords: 'crackers online, fireworks, sivakasi crackers, buy crackers online, festival fireworks',
          path: '/',
          ...heroImage,
        });
      }
    });

    // LocalBusiness structured data from the live footer configuration — the
    // admin-editable source of truth for name/address/phone/social links.
    // Opening hours and geo coordinates are omitted: no real data exists for
    // them, and fabricated facts are worse than absent ones.
    effect(() => {
      const footer = this.catalogService.footerConfig();
      if (!footer.shopName) {
        return;
      }
      const sameAs = [footer.instagramUrl, footer.facebookUrl].filter(Boolean);
      this.seoService.setJsonLd('local-business', {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: footer.shopName,
        url: 'https://suryacrackers.shop',
        logo: 'https://suryacrackers.shop/icons/icon-512.png',
        image: 'https://suryacrackers.shop/og-default.png',
        telephone: footer.phone,
        // Schema.org expects one address per LocalBusiness, so the branch the
        // admin flagged as primary is published rather than all of them joined.
        address: {
          '@type': 'PostalAddress',
          streetAddress: (footer.addresses.find((entry) => entry.isPrimary) ?? footer.addresses[0])?.address ?? '',
          addressCountry: 'IN',
        },
        areaServed: 'Tamil Nadu',
        priceRange: '₹₹',
        ...(sameAs.length > 0 ? { sameAs } : {}),
      });
    });

    this.seoService.setJsonLd('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Surya Crackers',
      url: 'https://suryacrackers.shop',
    });
    this.seoService.setJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Surya Crackers',
      url: 'https://suryacrackers.shop',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://suryacrackers.shop/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });

    // The inventory grid sits below the hero, categories and safety notice, so a
    // search submitted from the sticky header changes nothing inside the
    // viewport unless we bring the results up. Re-runs once the grid exists,
    // which also covers deep links like /?q=rocket landing on a loading page.
    effect(() => {
      const hasQuery = this.searchTokens().length > 0;
      const section = this.resultsSection()?.nativeElement;
      if (!hasQuery || !section) {
        return;
      }
      // Effects run before the template refresh, and a search also hides the
      // Featured Picks strip sitting above this grid — scrolling right now
      // would aim at a layout that is about to collapse and overshoot.
      this.scrollToResults();
    });
  }

  /**
   * Brings the inventory grid into view once the DOM has settled. Deferred
   * because selecting a category hides the Featured Picks strip above the
   * grid; scrolling immediately would aim at a layout about to collapse.
   */
  private scrollToResults(): void {
    afterNextRender(
      () => this.resultsSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      { injector: this.injector },
    );
  }

  selectCategory(category: Category | null): void {
    this.selectedSlug.set(category ? category.slug : ALL_SLUG);
    // Browsing a category is a deliberate move away from the search results.
    if (this.searchQuery()) {
      this.clearSearch();
    }
    // Featured Categories sit well above the grid, so filtering from there
    // otherwise changes nothing inside the viewport.
    this.scrollToResults();
  }

  clearSearch(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { q: null }, queryParamsHandling: 'merge' });
  }

  retry(): void {
    this.catalogService.refresh();
  }

  /** Name, SKU and category are all things customers type into a product search. */
  private searchHaystack(product: Product): string {
    return [
      product.name,
      product.sku,
      product.categorySlug.replace(/-/g, ' '),
      this.categoryNameBySlug().get(product.categorySlug) ?? '',
    ]
      .join(' ')
      .toLowerCase();
  }
}
