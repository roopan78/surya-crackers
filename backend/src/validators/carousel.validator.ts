import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().default(''),
  imageUrl: z.string().min(1, 'imageUrl is required'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateBannerSchema = createBannerSchema.partial();

export const bannerIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
