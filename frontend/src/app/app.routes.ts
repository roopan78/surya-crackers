import { Routes } from '@angular/router';
import { ageGuard } from './core/guards/age.guard';
import { StorefrontLayout } from './shared/components/storefront-layout/storefront-layout';

export const routes: Routes = [
  {
    path: 'age-verification',
    loadComponent: () =>
      import('./features/age-verification/age-verification').then((m) => m.AgeVerification),
  },
  {
    path: '',
    component: StorefrontLayout,
    canActivate: [ageGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/category-management/category-management').then(
            (m) => m.CategoryManagement,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/product-management/product-management').then(
            (m) => m.ProductManagement,
          ),
      },
      {
        path: 'carousel',
        loadComponent: () =>
          import('./features/admin/carousel-management/carousel-management').then(
            (m) => m.CarouselManagement,
          ),
      },
      {
        path: 'footer',
        loadComponent: () =>
          import('./features/admin/footer-configuration/footer-configuration').then(
            (m) => m.FooterConfiguration,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
