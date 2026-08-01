import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ChevronDown, ChevronLeft, ChevronRight, Package } from 'lucide-angular';
import { AdminOrderService } from '../../../core/services/admin-order.service';
import { Order, OrderStatus } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';

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

  /**
   * Cash orders are marked paid at pickup; UPI orders are marked paid once the
   * submitted UTR (or a bank credit that arrived without one) is verified
   * against the account statement.
   */
  canMarkPaid(order: Order): boolean {
    if (order.paymentProvider === 'CASH_ON_PICKUP') {
      return order.paymentStatus === 'PENDING';
    }
    if (order.paymentProvider === 'UPI_DIRECT') {
      return order.paymentStatus === 'PENDING' || order.paymentStatus === 'AWAITING_VERIFICATION';
    }
    return false;
  }

  confirmPaymentManually(id: string): void {
    this.orderService.confirmPaymentManually(id).subscribe({
      next: () => {
        this.toastService.success('Payment marked as received.');
        this.loadOrders();
      },
      error: () => this.toastService.error('Could not update payment status — please try again.'),
    });
  }
}
