import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Tags, PackagePlus, GalleryHorizontal, ShoppingCart } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './dashboard-home.html',
})
export class DashboardHome {
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);

  readonly TagsIcon = Tags;
  readonly PackagePlusIcon = PackagePlus;
  readonly GalleryHorizontalIcon = GalleryHorizontal;
  readonly ShoppingCartIcon = ShoppingCart;

  readonly stats = [
    { label: 'Categories', value: () => this.catalogService.categories().length, icon: Tags, link: '/admin/categories' },
    { label: 'Products', value: () => this.catalogService.products().length, icon: PackagePlus, link: '/admin/products' },
    { label: 'Carousel Banners', value: () => this.catalogService.banners().length, icon: GalleryHorizontal, link: '/admin/carousel' },
    { label: 'Live Cart Items', value: () => this.cartService.totalLineItems(), icon: ShoppingCart, link: '/checkout' },
  ];
}
