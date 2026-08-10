import { z } from 'zod';

export const updateFooterSchema = z.object({
  shopName: z.string().min(1, 'shopName is required'),
  // At least one branch address; blank entries are dropped rather than rejected,
  // so an admin leaving an empty row behind does not fail the save.
  addresses: z
    .array(z.string())
    .transform((entries) => entries.map((entry) => entry.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(1)).min(1, 'At least one address is required')),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  phone: z.string().min(1, 'phone is required'),
  whatsappNumber: z.string().min(1, 'whatsappNumber is required'),
  // Optional socials — empty string means "not configured" (storefront hides the icon)
  instagramUrl: z.string().url('instagramUrl must be a valid URL').or(z.literal('')).default(''),
  facebookUrl: z.string().url('facebookUrl must be a valid URL').or(z.literal('')).default(''),
  safetyDisclaimer: z.string().min(1, 'safetyDisclaimer is required'),
});

export type UpdateFooterInput = z.infer<typeof updateFooterSchema>;
