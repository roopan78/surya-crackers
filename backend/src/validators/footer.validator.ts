import { z } from 'zod';

export const updateFooterSchema = z.object({
  shopName: z.string().min(1, 'shopName is required'),
  address: z.string().min(1, 'address is required'),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  phone: z.string().min(1, 'phone is required'),
  whatsappNumber: z.string().min(1, 'whatsappNumber is required'),
  safetyDisclaimer: z.string().min(1, 'safetyDisclaimer is required'),
});

export type UpdateFooterInput = z.infer<typeof updateFooterSchema>;
