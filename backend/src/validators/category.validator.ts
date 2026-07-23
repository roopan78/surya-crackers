import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(slugPattern, 'Slug must be lowercase, alphanumeric and hyphen-separated'),
  description: z.string().optional(),
  imagePath: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listCategoriesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
