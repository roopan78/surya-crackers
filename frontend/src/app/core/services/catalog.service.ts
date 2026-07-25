import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, Category, Product, CarouselBanner, FooterConfig } from '../models';

const EMPTY_FOOTER_CONFIG: FooterConfig = {
  shopName: '',
  address: '',
  licenseNumber: '',
  phone: '',
  whatsappNumber: '',
  safetyDisclaimer: '',
};

interface HomepageContent {
  banners: CarouselBanner[];
  footer: FooterConfig | null;
}

/**
 * Public, read-only storefront catalog — sourced from the live backend
 * (active categories/products/banners/footer only). Admin CRUD lives in
 * AdminCatalogService, which calls `refresh()` here after every mutation
 * so storefront-facing signals stay in sync without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly productsSignal = signal<Product[]>([]);
  private readonly bannersSignal = signal<CarouselBanner[]>([]);
  private readonly footerConfigSignal = signal<FooterConfig>(EMPTY_FOOTER_CONFIG);
  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly products = this.productsSignal.asReadonly();
  readonly banners = this.bannersSignal.asReadonly();
  readonly footerConfig = this.footerConfigSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loadError = this.loadErrorSignal.asReadonly();

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loadingSignal.set(true);
    this.loadErrorSignal.set(false);

    forkJoin({
      categories: this.http.get<ApiSuccess<Category[]>>(`${environment.apiUrl}/categories`),
      products: this.http.get<ApiSuccess<Product[]>>(`${environment.apiUrl}/products`, {
        params: new HttpParams().set('limit', '100'),
      }),
      homepage: this.http.get<ApiSuccess<HomepageContent>>(`${environment.apiUrl}/content/homepage`),
    }).subscribe({
      next: ({ categories, products, homepage }) => {
        this.categoriesSignal.set(categories.data);
        this.productsSignal.set(products.data);
        this.bannersSignal.set(homepage.data.banners);
        if (homepage.data.footer) {
          this.footerConfigSignal.set(homepage.data.footer);
        }
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadErrorSignal.set(true);
        this.loadingSignal.set(false);
      },
    });
  }

  getProductById(id: string): Product | undefined {
    return this.productsSignal().find((p) => p.id === id);
  }
}
