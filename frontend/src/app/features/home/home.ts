import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { HeroCarousel } from '../../shared/components/hero-carousel/hero-carousel';
import { CategoryPill } from '../../shared/components/category-pill/category-pill';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { SafetyNotice } from '../../shared/components/safety-notice/safety-notice';
import { FeaturedCategories } from '../../shared/components/featured-categories/featured-categories';
import { PromoBanner } from '../../shared/components/promo-banner/promo-banner';
import { WhyChooseUs } from '../../shared/components/why-choose-us/why-choose-us';
import { Testimonials } from '../../shared/components/testimonials/testimonials';
import { FaqAccordion } from '../../shared/components/faq-accordion/faq-accordion';
import { Category } from '../../core/models';

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
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.catalogService.loading;
  readonly loadError = this.catalogService.loadError;

  readonly banners = computed(() =>
    [...this.catalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  readonly categories = this.catalogService.categories;
  readonly selectedSlug = signal<string>(ALL_SLUG);

  readonly searchQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('q') ?? '').trim().toLowerCase())),
    { initialValue: '' },
  );

  readonly featuredProducts = computed(() => this.catalogService.products().filter((p) => p.isFeatured));

  readonly visibleProducts = computed(() => {
    const slug = this.selectedSlug();
    const query = this.searchQuery();
    let products = this.catalogService.products();

    if (slug !== ALL_SLUG) {
      products = products.filter((p) => p.categorySlug === slug);
    }
    if (query) {
      products = products.filter((p) => p.name.toLowerCase().includes(query));
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

  selectCategory(category: Category | null): void {
    this.selectedSlug.set(category ? category.slug : ALL_SLUG);
  }

  retry(): void {
    this.catalogService.refresh();
  }
}
