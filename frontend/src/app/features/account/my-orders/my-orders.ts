import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Package } from 'lucide-angular';
import { OrderService } from '../../../core/services/order.service';
import { Order, PaymentProviderType } from '../../../core/models';

const PROVIDER_LABELS: Record<PaymentProviderType, string> = {
  CASH_ON_PICKUP: 'Cash on Pickup',
  UPI_DIRECT: 'UPI',
  PHONEPE: 'PhonePe',
};

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideAngularModule],
  templateUrl: './my-orders.html',
})
export class MyOrders implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly PackageIcon = Package;
  readonly providerLabels = PROVIDER_LABELS;
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
