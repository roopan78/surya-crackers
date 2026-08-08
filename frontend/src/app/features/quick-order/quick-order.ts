import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X, Info, PackageSearch } from 'lucide-angular';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { SeoService } from '../../core/services/seo.service';
import { Product } from '../../core/models';
import { CategoryAccordion } from './components/category-accordion/category-accordion';
import { OrderSummary, MIN_ORDER_OTHER, MIN_ORDER_TN } from './components/order-summary/order-summary';

interface CategoryGroup {
  slug: string;
  name: string;
  products: Product[];
}

/**
 * Category-wise bulk ordering: the whole catalog on one page, grouped into
 * collapsible categories so a customer can set quantities quickly without
 * visiting a product page per item.
 *
 * Quantities are held in the existing CartService rather than local state, so
 * the header count, this page and checkout are always the same order.
 */
@Component({
  selector: 'app-quick-order',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, CategoryAccordion, OrderSummary],
  templateUrl: './quick-order.html',
})
export class QuickOrder {
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);

  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly InfoIcon = Info;
  readonly PackageSearchIcon = PackageSearch;

  readonly minOrderTn = MIN_ORDER_TN;
  readonly minOrderOther = MIN_ORDER_OTHER;

  readonly loading = this.catalogService.loading;
  readonly loadError = this.catalogService.loadError;
  readonly quantities = this.cartService.boxesByProductId;
  readonly isEmpty = this.cartService.isEmpty;

  readonly searchTerm = signal('');
  /** Categories the user opened manually; ignored while a search is active. */
  private readonly manuallyExpanded = signal<ReadonlySet<string>>(new Set());

  private readonly searchTokens = computed(() =>
    this.searchTerm().trim().toLowerCase().split(/\s+/).filter(Boolean),
  );

  readonly searching = computed(() => this.searchTokens().length > 0);

  /** Active categories with their products, empty categories dropped. */
  private readonly allGroups = computed<CategoryGroup[]>(() => {
    const products = this.catalogService.products();
    return this.catalogService
      .categories()
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        products: products.filter((product) => product.categorySlug === category.slug),
      }))
      .filter((group) => group.products.length > 0);
  });

  /** Groups after search filtering; a category survives only if it has matches. */
  readonly groups = computed<CategoryGroup[]>(() => {
    const tokens = this.searchTokens();
    if (tokens.length === 0) {
      return this.allGroups();
    }
    return this.allGroups()
      .map((group) => ({
        ...group,
        products: group.products.filter((product) => {
          // Category name is part of the haystack so "sparklers" matches the
          // whole section, and price so "45" finds everything at that price.
          const haystack = `${product.name} ${group.name} ${product.price}`.toLowerCase();
          return tokens.every((token) => haystack.includes(token));
        }),
      }))
      .filter((group) => group.products.length > 0);
  });

  readonly matchCount = computed(() =>
    this.groups().reduce((total, group) => total + group.products.length, 0),
  );

  /**
   * Which sections are open. Searching auto-expands every matching category so
   * results are visible immediately; otherwise the user's own choices apply,
   * defaulting to just the first category.
   */
  readonly expandedSlugs = computed<ReadonlySet<string>>(() => {
    if (this.searching()) {
      return new Set(this.groups().map((group) => group.slug));
    }
    const manual = this.manuallyExpanded();
    if (manual.size > 0) {
      return manual;
    }
    const first = this.allGroups()[0];
    return first ? new Set([first.slug]) : new Set<string>();
  });

  constructor() {
    inject(SeoService).update({
      title: 'Quick Order - Bulk Crackers Price List | Surya Crackers',
      description:
        'Order Sivakasi crackers category-wise in one place. Set quantities instantly and check out with Surya Crackers.',
      keywords: 'crackers price list, bulk crackers order, sivakasi crackers wholesale',
      path: '/quick-order',
    });
  }

  isExpanded(slug: string): boolean {
    return this.expandedSlugs().has(slug);
  }

  toggleCategory(slug: string): void {
    // Start from what is currently shown so the first click after a search
    // (or on the default-open category) behaves the way it looks.
    const next = new Set(this.expandedSlugs());
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    this.manuallyExpanded.set(next);
    if (this.searching()) {
      this.searchTerm.set('');
    }
  }

  increment(product: Product): void {
    this.cartService.addToCart(product, 1);
  }

  decrement(product: Product): void {
    this.cartService.decrementBoxes(product.id);
  }

  /**
   * Absolute quantity typed into a row. `setBoxes` only updates products already
   * in the cart, so a first-time entry has to go through `addToCart`.
   */
  setQuantity(product: Product, quantity: number): void {
    const boxes = Math.max(0, Math.floor(quantity) || 0);
    const current = this.quantities().get(product.id) ?? 0;
    if (current === 0) {
      if (boxes > 0) {
        this.cartService.addToCart(product, boxes);
      }
      return;
    }
    this.cartService.setBoxes(product.id, boxes);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  retry(): void {
    this.catalogService.refresh();
  }
}
