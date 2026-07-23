import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  LayoutGrid,
  Tags,
  PackagePlus,
  GalleryHorizontal,
  Settings,
  ExternalLink,
} from 'lucide-angular';

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
  readonly ExternalLinkIcon = ExternalLink;

  readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
    { label: 'Categories', path: '/admin/categories', icon: Tags },
    { label: 'Products', path: '/admin/products', icon: PackagePlus },
    { label: 'Carousel', path: '/admin/carousel', icon: GalleryHorizontal },
    { label: 'Footer Config', path: '/admin/footer', icon: Settings },
  ];
}
