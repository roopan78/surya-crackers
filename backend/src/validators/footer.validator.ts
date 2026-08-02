import { z } from 'zod';

export const updateFooterSchema = z.object({
  shopName: z.string().min(1, 'shopName is required'),
  address: z.string().min(1, 'address is required'),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  phone: z.string().min(1, 'phone is required'),
  whatsappNumber: z.string().min(1, 'whatsappNumber is required'),
  // Optional socials — empty string means "not configured" (storefront hides the icon)
  instagramUrl: z.string().url('instagramUrl must be a valid URL').or(z.literal('')).default(''),
  facebookUrl: z.string().url('facebookUrl must be a valid URL').or(z.literal('')).default(''),
  safetyDisclaimer: z.string().min(1, 'safetyDisclaimer is required'),
});

export type UpdateFooterInput = z.infer<typeof updateFooterSchema>;
