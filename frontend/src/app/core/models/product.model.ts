export interface Product {
  id: string;
  name: string;
  categorySlug: string;
  price: number;
  /** Human readable packing description, e.g. "10 Pcs per box" */
  boxQuantity: string;
  imageUrl: string;
  /** YouTube watch link format, e.g. https://www.youtube.com/watch?v=XXXXXXXXXXX */
  videoUrl?: string;
  safetyInstructions: string;
  isFeatured: boolean;
}
