import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  LayoutGrid,
  Tags,
  PackagePlus,
  GalleryHorizontal,
  Settings,
  ExternalLink,
  LogOut,
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

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

  readonly ExternalLinkIcon = ExternalLink;
  readonly LogOutIcon = LogOut;

  readonly username = this.authService.username;

  readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
    { label: 'Categories', path: '/admin/categories', icon: Tags },
    { label: 'Products', path: '/admin/products', icon: PackagePlus },
    { label: 'Carousel', path: '/admin/carousel', icon: GalleryHorizontal },
    { label: 'Footer Config', path: '/admin/footer', icon: Settings },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
