import { Injectable, effect, signal } from '@angular/core';

const RECENTLY_VIEWED_STORAGE_KEY = 'sc_recently_viewed';
const MAX_ENTRIES = 8;

/**
 * Tracks which products the customer opened, newest first, persisted to
 * localStorage (same auto-sync pattern as CartService). Only ids are stored —
 * views resolve them against CatalogService's live products signal, so
 * renamed/repriced/deactivated products never render stale data and simply
 * drop out of the list.
 */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly idsSignal = signal<string[]>(this.loadFromStorage());

  /** Product ids, most recently viewed first. */
  readonly ids = this.idsSignal.asReadonly();

  constructor() {
    // Keep localStorage in sync with any signal mutation automatically.
    effect(() => {
      const ids = this.idsSignal();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(ids));
      }
    });
  }

  /** Move (or insert) a product to the front of the list, keeping it unique and capped. */
  record(productId: string): void {
    this.idsSignal.update((ids) => [productId, ...ids.filter((id) => id !== productId)].slice(0, MAX_ENTRIES));
  }

  private loadFromStorage(): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
