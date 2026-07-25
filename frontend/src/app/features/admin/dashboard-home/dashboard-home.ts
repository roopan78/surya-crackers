import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import {
  LucideAngularModule,
  Tags,
  PackagePlus,
  GalleryHorizontal,
  ClipboardList,
  IndianRupee,
  Hourglass,
  Truck,
  CircleCheck,
  CircleX,
} from 'lucide-angular';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { AdminOrderService, OrderStatus } from '../../../core/services/admin-order.service';

interface StatusRow {
  status: OrderStatus;
  label: string;
  color: string;
  icon: typeof Hourglass;
  count: number;
  percent: number;
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: typeof Hourglass }> = {
  PENDING_WHATSAPP: { label: 'Pending', color: '#fab219', icon: Hourglass },
  DISPATCHED: { label: 'Dispatched', color: '#ec835a', icon: Truck },
  DELIVERED: { label: 'Delivered', color: '#0ca30c', icon: CircleCheck },
  CANCELLED: { label: 'Cancelled', color: '#d03b3b', icon: CircleX },
};

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TitleCasePipe],
  templateUrl: './dashboard-home.html',
})
export class DashboardHome implements OnInit {
  private readonly catalogService = inject(AdminCatalogService);
  readonly orderService = inject(AdminOrderService);

  readonly TagsIcon = Tags;
  readonly PackagePlusIcon = PackagePlus;
  readonly GalleryHorizontalIcon = GalleryHorizontal;
  readonly ClipboardListIcon = ClipboardList;
  readonly IndianRupeeIcon = IndianRupee;

  readonly totalOrders = computed(() => this.orderService.meta()?.totalItems ?? this.orderService.orders().length);

  readonly totalRevenue = computed(() =>
    this.orderService
      .orders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.estimatedTotal, 0),
  );

  readonly stats = [
    { label: 'Total Orders', value: () => this.totalOrders(), icon: this.ClipboardListIcon, link: '/admin/orders' },
    { label: 'Revenue (Active Orders)', value: () => `₹${this.totalRevenue().toLocaleString('en-IN')}`, icon: this.IndianRupeeIcon, link: '/admin/orders' },
    { label: 'Products', value: () => this.catalogService.products().length, icon: PackagePlus, link: '/admin/products' },
    { label: 'Categories', value: () => this.catalogService.categories().length, icon: Tags, link: '/admin/categories' },
  ];

  readonly statusBreakdown = computed<StatusRow[]>(() => {
    const orders = this.orderService.orders();
    const counts: Record<OrderStatus, number> = {
      PENDING_WHATSAPP: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const order of orders) {
      counts[order.status] += 1;
    }
    const max = Math.max(1, ...Object.values(counts));

    return (Object.keys(STATUS_META) as OrderStatus[]).map((status) => ({
      status,
      label: STATUS_META[status].label,
      color: STATUS_META[status].color,
      icon: STATUS_META[status].icon,
      count: counts[status],
      percent: (counts[status] / max) * 100,
    }));
  });

  readonly recentOrders = computed(() => this.orderService.orders().slice(0, 5));

  ngOnInit(): void {
    this.catalogService.loadCategories();
    this.catalogService.loadProducts();
    this.orderService.loadOrders();
  }
}
