import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { customerAuthGuard } from './core/guards/customer-auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { StorefrontLayout } from './shared/components/storefront-layout/storefront-layout';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/login/login').then((m) => m.AdminLogin),
  },
  {
    path: '',
    component: StorefrontLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        // `:id` accepts either a product id or a slug — see ProductDetail.
        path: 'product/:id',
        loadComponent: () =>
          import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'category/:slug',
        loadComponent: () => import('./features/category/category').then((m) => m.CategoryPage),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
      },
      {
        path: 'order-confirmation/:orderNumber',
        loadComponent: () =>
          import('./features/order-confirmation/order-confirmation').then((m) => m.OrderConfirmation),
      },
      {
        path: 'login',
        loadComponent: () => import('./features/customer-login/customer-login').then((m) => m.CustomerLogin),
      },
      {
        path: 'account',
        canActivate: [customerAuthGuard],
        loadComponent: () => import('./features/account/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'account/orders',
        canActivate: [customerAuthGuard],
        loadComponent: () => import('./features/account/my-orders/my-orders').then((m) => m.MyOrders),
      },
      {
        path: 'refund-policy',
        loadComponent: () => import('./features/legal/refund-policy/refund-policy').then((m) => m.RefundPolicy),
      },
      {
        path: 'return-policy',
        loadComponent: () => import('./features/legal/return-policy/return-policy').then((m) => m.ReturnPolicy),
      },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
      },
      {
        path: 'terms-and-conditions',
        loadComponent: () =>
          import('./features/legal/terms-and-conditions/terms-and-conditions').then((m) => m.TermsAndConditions),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/order-management/order-management').then((m) => m.OrderManagement),
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
      {
        path: 'users',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/admin/user-management/user-management').then((m) => m.UserManagement),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
