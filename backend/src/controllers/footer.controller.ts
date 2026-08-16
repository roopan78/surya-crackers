import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { toAdminFooterDTO } from '../models/dto';
import { UpdateFooterInput } from '../validators/footer.validator';

const SINGLETON_ID = 1;

// GET /api/admin/footer-config
export const getFooterConfig = asyncHandler(async (_req: Request, res: Response) => {
  const [footer, addresses] = await Promise.all([
    prisma.footerConfig.findUnique({ where: { id: SINGLETON_ID } }),
    prisma.shopAddress.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  return sendSuccess(res, footer ? toAdminFooterDTO(footer, addresses) : null);
});

// PUT /api/admin/footer-config — upserts the single row
export const updateFooterConfig = asyncHandler(async (req: Request, res: Response) => {
  const { addresses, ...config } = req.body as UpdateFooterInput;

  // The list is replaced wholesale rather than diffed: it is a short, ordered
  // list edited as one form, and a transaction keeps the storefront from ever
  // reading a half-written set of addresses.
  const [footer, savedAddresses] = await prisma.$transaction(async (tx) => {
    const saved = await tx.footerConfig.upsert({
      where: { id: SINGLETON_ID },
      update: config,
      create: { id: SINGLETON_ID, ...config },
    });

    await tx.shopAddress.deleteMany({});
    await tx.shopAddress.createMany({
      data: withExactlyOnePrimary(addresses).map((entry, index) => ({ ...entry, sortOrder: index })),
    });

    return [saved, await tx.shopAddress.findMany({ orderBy: { sortOrder: 'asc' } })] as const;
  });

  return sendSuccess(res, toAdminFooterDTO(footer, savedAddresses));
});

/**
 * Structured data publishes a single location, so exactly one address must
 * carry the flag: the first one marked wins, and if none is marked the first
 * address becomes primary rather than leaving the site with no SEO address.
 */
function withExactlyOnePrimary(
  addresses: UpdateFooterInput['addresses'],
): { address: string; isPrimary: boolean }[] {
  const primaryIndex = addresses.findIndex((entry) => entry.isPrimary);
  const chosen = primaryIndex === -1 ? 0 : primaryIndex;
  return addresses.map((entry, index) => ({ address: entry.address, isPrimary: index === chosen }));
}
