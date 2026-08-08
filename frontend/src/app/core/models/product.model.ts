export interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  categorySlug: string;
  price: number;
  /** Pre-discount MRP; struck through when higher than `price`. */
  originalPrice?: number | null;
  /** Human readable packing description, e.g. "10 Pcs per box" */
  boxQuantity: string;
  imageUrl: string;
  /** YouTube watch link format, e.g. https://www.youtube.com/watch?v=XXXXXXXXXXX */
  videoUrl?: string;
  safetyInstructions: string;
  isFeatured: boolean;
  isActive: boolean;
  stockCount: number;
}
