import { Component, computed, inject, signal } from '@angular/core';
import { CatalogService } from '../../core/services/catalog.service';
import { HeroCarousel } from '../../shared/components/hero-carousel/hero-carousel';
import { CategoryPill } from '../../shared/components/category-pill/category-pill';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { SafetyNotice } from '../../shared/components/safety-notice/safety-notice';
import { Category } from '../../core/models';

const ALL_SLUG = 'all';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroCarousel, CategoryPill, ProductCard, SafetyNotice],
  templateUrl: './home.html',
})
export class Home {
  private readonly catalogService = inject(CatalogService);

  readonly banners = computed(() =>
    [...this.catalogService.banners()].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  readonly categories = this.catalogService.categories;
  readonly selectedSlug = signal<string>(ALL_SLUG);

  readonly featuredProducts = computed(() => this.catalogService.products().filter((p) => p.isFeatured));

  readonly visibleProducts = computed(() => {
    const slug = this.selectedSlug();
    const products = this.catalogService.products();
    return slug === ALL_SLUG ? products : products.filter((p) => p.categorySlug === slug);
  });

  readonly selectedCategoryName = computed(() => {
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
}
