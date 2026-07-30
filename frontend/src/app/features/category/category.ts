import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCard } from '../../shared/components/product-card/product-card';

/**
 * Dedicated landing page for a single category, reached from the global search
 * dropdown (`/category/:slug`). The homepage pills still filter in place — this
 * exists so a category can be linked to and shared directly.
 */
@Component({
  selector: 'app-category',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, ProductCard],
  templateUrl: './category.html',
})
export class CategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);

  readonly loading = this.catalogService.loading;
  readonly loadError = this.catalogService.loadError;

  readonly ArrowLeftIcon = ArrowLeft;

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

  retry(): void {
    this.catalogService.refresh();
  }
}
