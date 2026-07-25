import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Package } from 'lucide-angular';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [DatePipe, LucideAngularModule],
  templateUrl: './my-orders.html',
})
export class MyOrders implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly PackageIcon = Package;
  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
