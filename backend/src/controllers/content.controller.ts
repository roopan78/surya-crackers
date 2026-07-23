import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { toBannerDTO, toFooterDTO } from '../models/dto';

const FOOTER_SINGLETON_ID = 1;

// GET /api/content/homepage — consolidated banners + footer config in a single transaction
export const getHomepageContent = asyncHandler(async (_req: Request, res: Response) => {
  const [banners, footer] = await prisma.$transaction([
    prisma.carouselBanner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.footerConfig.findUnique({ where: { id: FOOTER_SINGLETON_ID } }),
  ]);

  return sendSuccess(res, {
    banners: banners.map(toBannerDTO),
    footer: footer ? toFooterDTO(footer) : null,
  });
});
