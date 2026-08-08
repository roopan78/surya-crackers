import { Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { ProductCard } from '../../shared/components/product-card/product-card';

/**
 * Dedicated landing page for a single category, reached from the global search
 * dropdown (`/category/:slug`). The homepage pills still filter in place — this
 * exists so a category can be linked to and shared directly.
 */
@Component({
  selector: 'app-category',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './category.html',
})
export class CategoryPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);
  private readonly seoService = inject(SeoService);

  readonly loading = this.catalogService.loading;
  readonly loadError = this.catalogService.loadError;

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' },
  );

  readonly category = computed(() =>
    this.catalogService.categories().find((c) => c.slug === this.slug()),
  );

  readonly products = computed(() =>
    this.catalogService.products().filter((p) => p.categorySlug === this.slug()),
  );

  /** Cross-links to every other category — internal linking for crawlers and shoppers. */
  readonly otherCategories = computed(() =>
    this.catalogService.categories().filter((c) => c.slug !== this.slug()),
  );

  constructor() {
    // Per-category SEO metadata + CollectionPage/Breadcrumb structured data.
    // Re-runs when the async catalog resolves and on category-to-category navigation.
    effect(() => {
      const category = this.category();
      if (!category) {
        // A removed category's URL still answers 200 with a "not found" view
        // (static SPA — no real 404 status), which reads as a soft 404. Once
        // the catalog has loaded and the slug still doesn't resolve, mark it
        // noindex so search engines drop the URL.
        if (!this.loading() && !this.loadError()) {
          this.seoService.update({
            title: 'Category Not Found | Surya Crackers',
            description: 'This category is no longer available. Browse the full Surya Crackers range instead.',
            path: `/category/${this.slug()}`,
            robots: 'noindex,follow',
          });
          this.seoService.setJsonLd('collection', null);
          this.seoService.setJsonLd('breadcrumb', null);
        }
        return;
      }
      const path = `/category/${category.slug}`;

      this.seoService.update({
        title:
          category.name.length <= 14
            ? `Buy ${category.name} Online - Sivakasi ${category.name} | Surya Crackers`
            : `Buy ${category.name} Online | Surya Crackers`,
        description: `Browse premium ${category.name.toLowerCase()} online from Surya Crackers. Shop quality Sivakasi fireworks today.`,
        keywords: `${category.name.toLowerCase()}, ${category.name.toLowerCase()} online, sivakasi crackers, buy crackers online`,
        path,
        ...(category.image ? { image: category.image, imageAlt: category.name } : {}),
      });

      this.seoService.setJsonLd('collection', {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        url: `https://suryacrackers.shop${path}`,
        ...(category.description ? { description: category.description } : {}),
      });

      this.seoService.setJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://suryacrackers.shop/' },
          { '@type': 'ListItem', position: 2, name: category.name },
        ],
      });
    });
  }

  ngOnDestroy(): void {
    this.seoService.setJsonLd('collection', null);
    this.seoService.setJsonLd('breadcrumb', null);
  }

  retry(): void {
    this.catalogService.refresh();
  }
}
