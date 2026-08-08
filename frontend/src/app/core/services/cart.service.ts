import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, Product } from '../models';

const CART_STORAGE_KEY = 'sc_cart_items';

/**
 * Centralized cart state manager built on Angular Signals.
 * Tracks line items (product + box quantity), derives totals via
 * `computed`, and auto-syncs to localStorage on every mutation so the
 * cart survives reloads.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(this.loadFromStorage());

  /** Read-only view of current cart line items. */
  readonly items = this.itemsSignal.asReadonly();

  /** Total number of boxes across all line items. */
  readonly totalBoxes = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.boxes, 0),
  );

  /** Total number of distinct products in the cart. */
  readonly totalLineItems = computed(() => this.itemsSignal().length);

  /** Grand total price across all line items (price * boxes). */
  readonly grandTotal = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.product.price * item.boxes, 0),
  );

  readonly isEmpty = computed(() => this.itemsSignal().length === 0);

  /**
   * Box count keyed by product id. Built once per cart change so a long list
   * (the Quick Order page renders the whole catalog) can look up each row's
   * quantity in O(1) instead of scanning the cart for every row.
   */
  readonly boxesByProductId = computed(
    () => new Map(this.itemsSignal().map((item) => [item.product.id, item.boxes])),
  );

  constructor() {
    // Keep localStorage in sync with any signal mutation automatically.
    effect(() => {
      const items = this.itemsSignal();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    });
  }

  /** Add a product to the cart, or increment its box count if already present. */
  addToCart(product: Product, boxes = 1): void {
    this.itemsSignal.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, boxes: i.boxes + boxes } : i,
        );
      }
      return [...items, { product, boxes }];
    });
  }

  /** Set an absolute box quantity for a line item (removes it if <= 0). */
  setBoxes(productId: string, boxes: number): void {
    if (boxes <= 0) {
      this.removeItem(productId);
      return;
    }
    this.itemsSignal.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, boxes } : i)),
    );
  }

  incrementBoxes(productId: string): void {
    this.itemsSignal.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, boxes: i.boxes + 1 } : i)),
    );
  }

  decrementBoxes(productId: string): void {
    this.itemsSignal.update((items) => {
      const target = items.find((i) => i.product.id === productId);
      if (!target) {
        return items;
      }
      if (target.boxes <= 1) {
        return items.filter((i) => i.product.id !== productId);
      }
      return items.map((i) =>
        i.product.id === productId ? { ...i, boxes: i.boxes - 1 } : i,
      );
    });
  }

  removeItem(productId: string): void {
    this.itemsSignal.update((items) => items.filter((i) => i.product.id !== productId));
  }

  clearCart(): void {
    this.itemsSignal.set([]);
  }

  private loadFromStorage(): CartItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
