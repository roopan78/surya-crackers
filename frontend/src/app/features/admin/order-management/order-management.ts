import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { LucideAngularModule, ChevronDown, ChevronLeft, ChevronRight, Package, Pencil, Plus, Trash2 } from 'lucide-angular';
import { AdminOrderService } from '../../../core/services/admin-order.service';
import { AdminCatalogService } from '../../../core/services/admin-catalog.service';
import { Order, OrderItem, OrderStatus, PaymentProviderType, RecordablePaymentProvider } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';

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

/**
 * Statuses whose contents staff may still rewrite. Matches what the API will
 * accept — a COMPLETED order has left the shop and a CANCELLED one is a record
 * of what was not sold.
 */
const RESTRUCTURABLE_STATUSES: OrderStatus[] = ['PENDING', 'READY_FOR_PICKUP'];

/** How many catalog matches the add-an-item picker offers before asking for a narrower search. */
const PICKER_RESULTS = 8;

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass, LucideAngularModule, ConfirmModal],
  templateUrl: './order-management.html',
})
export class OrderManagement implements OnInit {
  readonly orderService = inject(AdminOrderService);
  readonly catalogService = inject(AdminCatalogService);
  private readonly toastService = inject(ToastService);

  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly PackageIcon = Package;
  readonly PencilIcon = Pencil;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilter = signal<OrderStatus | ''>('');

  /**
   * A cancellation waiting to be confirmed. Held rather than applied because
   * cancelling emails the customer, which is not something to do on a stray
   * click in a dropdown.
   */
  readonly pendingCancel = signal<Order | null>(null);
  /**
   * What each select is showing while it differs from the saved order — needed
   * so dismissing the confirmation snaps the dropdown back instead of leaving
   * it reading "Cancelled" for an order that is still pending.
   */
  readonly statusDraft = signal<Record<string, OrderStatus>>({});
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly expandedId = signal<string | null>(null);

  /** The order whose items are open for editing, and the lines as edited. */
  readonly editingId = signal<string | null>(null);
  readonly draft = signal<OrderItem[]>([]);
  readonly savingDraft = signal(false);

  readonly draftTotal = computed(() =>
    this.draft().reduce((sum, line) => sum + line.price * line.boxes, 0),
  );

  /** Free text for the add-an-item picker, matched against name and SKU. */
  readonly productSearch = signal('');

  /**
   * Catalog matches for the picker: everything not already on the draft, then
   * narrowed by the search, then capped.
   *
   * Matched against the SKU as well as the name because that is what is printed
   * on the carton — a staff member reaching for a substitute at the counter is
   * as likely to be reading a code as a name. Capped because a bare search term
   * like "s" would otherwise render the whole catalog into the row.
   */
  readonly addableProducts = computed(() => {
    const taken = new Set(this.draft().map((line) => line.productId));
    const query = this.productSearch().trim().toLowerCase();

    return this.catalogService
      .products()
      .filter((product) => !taken.has(product.id))
      .filter(
        (product) =>
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query),
      )
      .slice(0, PICKER_RESULTS);
  });

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

  /** The dropdown's value, which may be a choice not yet confirmed. */
  shownStatus(order: Order): OrderStatus {
    return this.statusDraft()[order.id] ?? order.status;
  }

  statusChanged(order: Order, status: OrderStatus): void {
    if (status === order.status) {
      return;
    }
    // Cancelling tells the customer by email, so it asks first. Every other
    // transition is reversible from this same dropdown and saves immediately.
    if (status === 'CANCELLED') {
      this.statusDraft.update((drafts) => ({ ...drafts, [order.id]: status }));
      this.pendingCancel.set(order);
      return;
    }
    this.updateStatus(order.id, status);
  }

  confirmCancel(): void {
    const order = this.pendingCancel();
    if (!order) return;
    this.pendingCancel.set(null);
    this.updateStatus(order.id, 'CANCELLED');
  }

  dismissCancel(): void {
    const order = this.pendingCancel();
    this.pendingCancel.set(null);
    if (order) {
      this.clearDraft(order.id);
    }
  }

  cancelMessage(order: Order): string {
    const who = order.customerName || 'the customer';
    return (
      `Order ${order.orderNumber} will be cancelled and nothing prepared for collection. ` +
      `${who} is emailed about the cancellation straight away, so only do this if they know.`
    );
  }

  /** Colour the control by what it is showing, the way the status badges do. */
  statusClass(order: Order): string {
    switch (this.shownStatus(order)) {
      case 'COMPLETED':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'READY_FOR_PICKUP':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      case 'CANCELLED':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  }

  private clearDraft(id: string): void {
    this.statusDraft.update((drafts) => {
      const next = { ...drafts };
      delete next[id];
      return next;
    });
  }

  updateStatus(id: string, status: OrderStatus): void {
    this.orderService.updateStatus(id, status).subscribe({
      next: () => {
        this.toastService.success(
          status === 'CANCELLED' ? 'Order cancelled — the customer has been emailed.' : 'Order status updated.',
        );
        this.clearDraft(id);
        this.loadOrders();
      },
      error: () => {
        this.clearDraft(id);
        this.toastService.error('Could not update order status — please try again.');
      },
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

  // --- Restructuring an order staff cannot fill ------------------------------

  /**
   * Stock in Sivakasi moves faster than the catalog does, so an order regularly
   * has to be rebuilt at the counter. Anything already paid is off limits:
   * money changed hands against the old total.
   */
  canRestructure(order: Order): boolean {
    return order.paymentStatus !== 'PAID' && RESTRUCTURABLE_STATUSES.includes(order.status);
  }

  startEdit(order: Order): void {
    this.expandedId.set(order.id);
    this.editingId.set(order.id);
    // Copied, not referenced: abandoning the edit has to leave the row as it was.
    this.draft.set(order.items.map((item) => ({ ...item })));
    this.productSearch.set('');
    if (this.catalogService.products().length === 0) {
      this.catalogService.loadProducts();
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set([]);
    this.productSearch.set('');
  }

  setBoxes(productId: string, raw: string | number): void {
    const boxes = Math.max(1, Math.floor(Number(raw) || 1));
    this.draft.update((lines) => lines.map((line) => (line.productId === productId ? { ...line, boxes } : line)));
  }

  removeLine(productId: string): void {
    this.draft.update((lines) => lines.filter((line) => line.productId !== productId));
  }

  addLine(productId: string): void {
    const product = this.catalogService.products().find((candidate) => candidate.id === productId);
    if (!product) return;

    this.draft.update((lines) => [
      ...lines,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        boxQuantity: product.boxQuantity,
        boxes: 1,
      },
    ]);
    // Cleared so the next substitute can be typed straight away, rather than
    // leaving a stale result list under a term that has already been used.
    this.productSearch.set('');
  }

  saveDraft(order: Order): void {
    const lines = this.draft();
    if (lines.length === 0) {
      // Emptying an order is a cancellation, and that is the status dropdown's
      // job — it tells the customer something this route does not.
      this.toastService.error('An order must keep at least one item. Cancel it instead.');
      return;
    }

    this.savingDraft.set(true);
    const items = lines.map((line) => ({ productId: line.productId, boxes: line.boxes }));
    this.orderService.restructure(order.id, items).subscribe({
      next: () => {
        this.savingDraft.set(false);
        this.cancelEdit();
        this.toastService.success('Order updated.');
        this.loadOrders();
      },
      error: () => {
        this.savingDraft.set(false);
        this.toastService.error('Could not update the order — please try again.');
      },
    });
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
