import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ChevronDown, ChevronLeft, ChevronRight, Package } from 'lucide-angular';
import { AdminOrderService } from '../../../core/services/admin-order.service';
import { Order, OrderStatus, PaymentProviderType, RecordablePaymentProvider } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';

const PROVIDER_LABELS: Record<PaymentProviderType, string> = {
  CASH_ON_PICKUP: 'Cash',
  UPI_DIRECT: 'Online',
  PHONEPE: 'PhonePe',
};

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 10;

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [FormsModule, DatePipe, LucideAngularModule],
  templateUrl: './order-management.html',
})
export class OrderManagement implements OnInit {
  readonly orderService = inject(AdminOrderService);
  private readonly toastService = inject(ToastService);

  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly PackageIcon = Package;

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilter = signal<OrderStatus | ''>('');
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly expandedId = signal<string | null>(null);

  readonly filteredOrders = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const orders = this.orderService.orders();
    if (!query) return orders;
    return orders.filter(
      (o) => (o.customerName ?? '').toLowerCase().includes(query) || o.orderNumber.toLowerCase().includes(query),
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / PAGE_SIZE)));

  readonly pagedOrders = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filteredOrders().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orderService.loadOrders({ status: this.statusFilter(), limit: 100 });
    this.page.set(1);
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  updateStatus(id: string, status: OrderStatus): void {
    this.orderService.updateStatus(id, status).subscribe({
      next: () => {
        this.toastService.success('Order status updated.');
        this.loadOrders();
      },
      error: () => this.toastService.error('Could not update order status — please try again.'),
    });
  }

  /** Anything not yet settled can be recorded as paid, whatever the method. */
  canRecordPayment(order: Order): boolean {
    return order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED';
  }

  /** Blank until staff record one — an order arrives with no method chosen. */
  providerLabel(order: Order): string {
    return order.paymentProvider ? PROVIDER_LABELS[order.paymentProvider] : 'Method not decided';
  }

  recordPayment(id: string, paymentProvider: RecordablePaymentProvider): void {
    this.orderService.recordPayment(id, paymentProvider).subscribe({
      next: () => {
        this.toastService.success(
          paymentProvider === 'CASH_ON_PICKUP' ? 'Recorded as paid in cash.' : 'Recorded as paid online.',
        );
        this.loadOrders();
      },
      error: () => this.toastService.error('Could not record the payment — please try again.'),
    });
  }
}
