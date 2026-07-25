import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, Category, Product, CarouselBanner, FooterConfig } from '../models';
import { CatalogService } from './catalog.service';

export interface CategoryWritePayload {
  name: string;
  slug: string;
  description: string;
  imagePath: string;
  isActive: boolean;
}

export interface ProductWritePayload {
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  price: number;
  boxQuantity: string;
  imageUrls: string[];
  videoUrl: string;
  safetyInstructions: string;
  isFeatured: boolean;
  isActive: boolean;
  stockCount: number;
}

export interface BannerWritePayload {
  title: string;
  subtitle: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const ADMIN_BASE = `${environment.apiUrl}/admin`;

/**
 * Admin-scoped catalog CRUD (categories/products/banners/footer) — sees
 * inactive items too, unlike the public CatalogService. Every mutation
 * also triggers CatalogService.refresh() so storefront-facing signals
 * pick up the change immediately.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private readonly http = inject(HttpClient);
  private readonly catalogService = inject(CatalogService);

  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly productsSignal = signal<Product[]>([]);
  private readonly bannersSignal = signal<CarouselBanner[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly products = this.productsSignal.asReadonly();
  readonly banners = this.bannersSignal.asReadonly();

  // ---------- Categories ----------
  loadCategories(): void {
    this.http
      .get<ApiSuccess<Category[]>>(`${ADMIN_BASE}/categories`, {
        params: new HttpParams().set('includeInactive', 'true'),
      })
      .subscribe((res) => this.categoriesSignal.set(res.data));
  }

  createCategory(payload: CategoryWritePayload): Observable<Category> {
    return this.http.post<ApiSuccess<Category>>(`${ADMIN_BASE}/categories`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadCategories.bind(this))),
    );
  }

  updateCategory(id: string, payload: CategoryWritePayload): Observable<Category> {
    return this.http.put<ApiSuccess<Category>>(`${ADMIN_BASE}/categories/${id}`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadCategories.bind(this))),
    );
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${ADMIN_BASE}/categories/${id}`).pipe(
      map(() => undefined),
      tap(() => this.afterMutation(this.loadCategories.bind(this))),
    );
  }

  // ---------- Products ----------
  loadProducts(): void {
    this.http
      .get<ApiSuccess<Product[]>>(`${ADMIN_BASE}/products`, { params: new HttpParams().set('limit', '100') })
      .subscribe((res) => this.productsSignal.set(res.data));
  }

  createProduct(payload: ProductWritePayload): Observable<Product> {
    return this.http.post<ApiSuccess<Product>>(`${ADMIN_BASE}/products`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadProducts.bind(this))),
    );
  }

  updateProduct(id: string, payload: ProductWritePayload): Observable<Product> {
    return this.http.put<ApiSuccess<Product>>(`${ADMIN_BASE}/products/${id}`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadProducts.bind(this))),
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${ADMIN_BASE}/products/${id}`).pipe(
      map(() => undefined),
      tap(() => this.afterMutation(this.loadProducts.bind(this))),
    );
  }

  // ---------- Carousel Banners ----------
  loadBanners(): void {
    this.http.get<ApiSuccess<CarouselBanner[]>>(`${ADMIN_BASE}/carousel`).subscribe((res) => this.bannersSignal.set(res.data));
  }

  createBanner(payload: BannerWritePayload): Observable<CarouselBanner> {
    return this.http.post<ApiSuccess<CarouselBanner>>(`${ADMIN_BASE}/carousel`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadBanners.bind(this))),
    );
  }

  updateBanner(id: string, payload: Partial<BannerWritePayload>): Observable<CarouselBanner> {
    return this.http.put<ApiSuccess<CarouselBanner>>(`${ADMIN_BASE}/carousel/${id}`, payload).pipe(
      map((res) => res.data),
      tap(() => this.afterMutation(this.loadBanners.bind(this))),
    );
  }

  deleteBanner(id: string): Observable<void> {
    return this.http.delete<ApiSuccess<{ id: string }>>(`${ADMIN_BASE}/carousel/${id}`).pipe(
      map(() => undefined),
      tap(() => this.afterMutation(this.loadBanners.bind(this))),
    );
  }

  // ---------- Footer Config ----------
  getFooterConfig(): Observable<FooterConfig | null> {
    return this.http.get<ApiSuccess<FooterConfig | null>>(`${ADMIN_BASE}/footer-config`).pipe(map((res) => res.data));
  }

  updateFooterConfig(payload: FooterConfig): Observable<FooterConfig> {
    return this.http.put<ApiSuccess<FooterConfig>>(`${ADMIN_BASE}/footer-config`, payload).pipe(
      map((res) => res.data),
      tap(() => this.catalogService.refresh()),
    );
  }

  private afterMutation(reload: () => void): void {
    reload();
    this.catalogService.refresh();
  }
}
