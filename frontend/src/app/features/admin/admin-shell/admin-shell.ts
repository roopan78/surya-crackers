import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  LayoutGrid,
  Tags,
  PackagePlus,
  GalleryHorizontal,
  Settings,
  ClipboardList,
  Users,
  ExternalLink,
  LogOut,
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';

interface AdminNavItem {
  label: string;
  path: string;
  icon: typeof LayoutGrid;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    inject(SeoService).update({
      title: 'Admin Workspace | Surya Crackers',
      description: 'Surya Crackers staff administration.',
      path: '/admin',
      robots: 'noindex,nofollow',
    });
  }

  readonly ExternalLinkIcon = ExternalLink;
  readonly LogOutIcon = LogOut;

  readonly currentUser = this.authService.currentUser;

  readonly navItems = computed<AdminNavItem[]>(() => {
    const items: AdminNavItem[] = [
      { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
      { label: 'Orders', path: '/admin/orders', icon: ClipboardList },
      { label: 'Categories', path: '/admin/categories', icon: Tags },
      { label: 'Products', path: '/admin/products', icon: PackagePlus },
      { label: 'Carousel', path: '/admin/carousel', icon: GalleryHorizontal },
      { label: 'Footer Config', path: '/admin/footer', icon: Settings },
    ];
    if (this.currentUser()?.role === 'SUPER_ADMIN') {
      items.push({ label: 'Users & Roles', path: '/admin/users', icon: Users });
    }
    return items;
  });

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
