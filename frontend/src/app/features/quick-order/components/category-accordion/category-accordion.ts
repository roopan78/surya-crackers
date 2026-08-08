import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { Product } from '../../../../core/models';
import { ProductRow } from '../product-row/product-row';

export interface QuantityChange {
  product: Product;
}

/**
 * One collapsible category section. Rows are only rendered while the section
 * is open, so a catalog of hundreds of products costs nothing until expanded —
 * which is what keeps this page fast without virtual scrolling.
 */
@Component({
  selector: 'app-category-accordion',
  standalone: true,
  imports: [LucideAngularModule, ProductRow],
  templateUrl: './category-accordion.html',
})
export class CategoryAccordion {
  readonly title = input.required<string>();
  readonly panelId = input.required<string>();
  readonly products = input.required<Product[]>();
  readonly expanded = input(false);
  /** Box counts keyed by product id — one shared map, O(1) per row. */
  readonly quantities = input.required<Map<string, number>>();

  readonly toggled = output<void>();
  readonly incremented = output<Product>();
  readonly decremented = output<Product>();
  readonly quantitySet = output<{ product: Product; quantity: number }>();

  readonly ChevronDownIcon = ChevronDown;

  /** How many distinct products in this category are already in the order. */
  readonly selectedCount = computed(() => {
    const quantities = this.quantities();
    return this.products().reduce((count, product) => count + (quantities.get(product.id) ? 1 : 0), 0);
  });

  quantityOf(product: Product): number {
    return this.quantities().get(product.id) ?? 0;
  }
}
