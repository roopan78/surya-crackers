import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  slug: z.string().regex(slugPattern, 'Slug must be lowercase, alphanumeric and hyphen-separated'),
  categoryId: z.string().min(1, 'categoryId is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  boxQuantity: z.string().min(1, 'boxQuantity is required'),
  imageUrls: z.array(z.string().min(1)).default([]),
  videoUrl: z.string().optional().default(''),
  safetyInstructions: z.string().min(1, 'safetyInstructions is required'),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  stockCount: z.coerce.number().int().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const productSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const listProductsQuerySchema = z.object({
  categorySlug: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
