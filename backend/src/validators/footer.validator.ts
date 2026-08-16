import { z } from 'zod';

/**
 * A UPI virtual payment address: `handle@psp`. NPCI allows letters, digits and
 * `.`, `-`, `_` in the handle; the PSP suffix is alphabetic. Kept deliberately
 * permissive on the handle because banks keep adding formats, and a VPA that
 * this rejects is one the shop genuinely cannot be paid on.
 */
const VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export const updateFooterSchema = z.object({
  shopName: z.string().min(1, 'shopName is required'),
  // At least one branch address; blank entries are dropped rather than rejected,
  // so an admin leaving an empty row behind does not fail the save.
  addresses: z
    .array(z.object({ address: z.string(), isPrimary: z.coerce.boolean().default(false) }))
    .transform((entries) =>
      entries.map((entry) => ({ ...entry, address: entry.address.trim() })).filter((entry) => entry.address),
    )
    .pipe(z.array(z.object({ address: z.string().min(1), isPrimary: z.boolean() })).min(1, 'At least one address is required')),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  phone: z.string().min(1, 'phone is required'),
  whatsappNumber: z.string().min(1, 'whatsappNumber is required'),
  // Optional socials — empty string means "not configured" (storefront hides the icon)
  instagramUrl: z.string().url('instagramUrl must be a valid URL').or(z.literal('')).default(''),
  facebookUrl: z.string().url('facebookUrl must be a valid URL').or(z.literal('')).default(''),
  safetyDisclaimer: z.string().min(1, 'safetyDisclaimer is required'),
  // UPI collection details. Empty string means "not configured"; the staff app
  // treats that as "ask for it before showing a QR" rather than an error, so a
  // shop that only takes cash never has to fill these in.
  //
  // Optional rather than defaulted, and the controller passes undefined through
  // to Prisma untouched: the Angular admin PUTs this same form without knowing
  // about UPI, and a default of '' would silently wipe the shop's VPA every
  // time someone saved the footer from the web.
  upiId: z
    .string()
    .trim()
    .regex(VPA_PATTERN, 'upiId must look like name@bank')
    .or(z.literal(''))
    .optional(),
  upiPayeeName: z.string().trim().max(50, 'upiPayeeName must be 50 characters or fewer').optional(),
});

export type UpdateFooterInput = z.infer<typeof updateFooterSchema>;
