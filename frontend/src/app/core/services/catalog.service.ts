import { Injectable, signal } from '@angular/core';
import { Category, Product, CarouselBanner, FooterConfig } from '../models';
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_BANNERS,
  MOCK_FOOTER_CONFIG,
} from '../models/mock-data';

const STORAGE_KEYS = {
  categories: 'sc_categories',
  products: 'sc_products',
  banners: 'sc_banners',
  footer: 'sc_footer_config',
};

/**
 * Central client-side "catalog" store. There is no backend yet — this
 * service owns categories / products / carousel banners / footer config
 * as Angular signals and mirrors every mutation into localStorage so
 * that both the storefront and the Admin dashboard read/write the same
 * local state and it survives page reloads.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly categoriesSignal = signal<Category[]>(this.loadOrSeed('categories', MOCK_CATEGORIES));
  private readonly productsSignal = signal<Product[]>(this.loadOrSeed('products', MOCK_PRODUCTS));
  private readonly bannersSignal = signal<CarouselBanner[]>(this.loadOrSeed('banners', MOCK_BANNERS));
  private readonly footerConfigSignal = signal<FooterConfig>(this.loadOrSeed('footer', MOCK_FOOTER_CONFIG));

  readonly categories = this.categoriesSignal.asReadonly();
  readonly products = this.productsSignal.asReadonly();
  readonly banners = this.bannersSignal.asReadonly();
  readonly footerConfig = this.footerConfigSignal.asReadonly();

  // ---------- Categories ----------
  addCategory(category: Category): void {
    this.categoriesSignal.update((list) => [...list, category]);
    this.persist('categories', this.categoriesSignal());
  }

  updateCategory(id: string, changes: Partial<Category>): void {
    this.categoriesSignal.update((list) =>
      list.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
    this.persist('categories', this.categoriesSignal());
  }

  deleteCategory(id: string): void {
    this.categoriesSignal.update((list) => list.filter((c) => c.id !== id));
    this.persist('categories', this.categoriesSignal());
  }

  // ---------- Products ----------
  addProduct(product: Product): void {
    this.productsSignal.update((list) => [...list, product]);
    this.persist('products', this.productsSignal());
  }

  updateProduct(id: string, changes: Partial<Product>): void {
    this.productsSignal.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    );
    this.persist('products', this.productsSignal());
  }

  deleteProduct(id: string): void {
    this.productsSignal.update((list) => list.filter((p) => p.id !== id));
    this.persist('products', this.productsSignal());
  }

  getProductById(id: string): Product | undefined {
    return this.productsSignal().find((p) => p.id === id);
  }

  // ---------- Carousel Banners ----------
  addBanner(banner: CarouselBanner): void {
    this.bannersSignal.update((list) => [...list, banner]);
    this.persist('banners', this.bannersSignal());
  }

  updateBanner(id: string, changes: Partial<CarouselBanner>): void {
    this.bannersSignal.update((list) =>
      list.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    );
    this.persist('banners', this.bannersSignal());
  }

  deleteBanner(id: string): void {
    this.bannersSignal.update((list) => list.filter((b) => b.id !== id));
    this.persist('banners', this.bannersSignal());
  }

  // ---------- Footer Config ----------
  updateFooterConfig(config: FooterConfig): void {
    this.footerConfigSignal.set(config);
    this.persist('footer', config);
  }

  // ---------- Persistence helpers ----------
  private loadOrSeed<T>(key: keyof typeof STORAGE_KEYS, seed: T): T {
    if (typeof localStorage === 'undefined') {
      return seed;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[key]);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // fall through to seed on parse failure
    }
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(seed));
    return seed;
  }

  private persist<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  }
}
