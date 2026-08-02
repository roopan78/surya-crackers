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
    this.seoService.update({
      title: 'Buy Crackers Online - Sivakasi Fireworks | Surya Crackers',
      description:
        'Buy premium Sivakasi crackers and fireworks online from Surya Crackers. Browse quality products and order online today.',
      keywords: 'crackers online, fireworks, sivakasi crackers, buy crackers online, festival fireworks',
      path: '/',
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
      afterNextRender(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), {
        injector: this.injector,
      });
    });
  }

  selectCategory(category: Category | null): void {
    this.selectedSlug.set(category ? category.slug : ALL_SLUG);
    // Browsing a category is a deliberate move away from the search results.
    if (this.searchQuery()) {
      this.clearSearch();
    }
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
