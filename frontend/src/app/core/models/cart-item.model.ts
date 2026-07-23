import { Product } from './product.model';

export interface CartItem {
  product: Product;
  /** Number of boxes of this product in the cart */
  boxes: number;
}
