import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toBannerDTO } from '../models/dto';
import { CreateBannerInput, UpdateBannerInput } from '../validators/carousel.validator';

// GET /api/admin/carousel — admin, all banners
export const listAllBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await prisma.carouselBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  return sendSuccess(res, banners.map(toBannerDTO));
});

// GET /api/admin/carousel/:id
export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  const banner = await prisma.carouselBanner.findUnique({ where: { id: req.params.id } });
  if (!banner) {
    throw ApiError.notFound('Banner not found');
  }
  return sendSuccess(res, toBannerDTO(banner));
});

// POST /api/admin/carousel
export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateBannerInput;
  const banner = await prisma.carouselBanner.create({ data: input });
  return sendSuccess(res, toBannerDTO(banner), 201);
});

// PUT /api/admin/carousel/:id
export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateBannerInput;
  const existing = await prisma.carouselBanner.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Banner not found');
  }
  const banner = await prisma.carouselBanner.update({ where: { id: req.params.id }, data: input });
  return sendSuccess(res, toBannerDTO(banner));
});

// DELETE /api/admin/carousel/:id
export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.carouselBanner.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Banner not found');
  }
  await prisma.carouselBanner.delete({ where: { id: req.params.id } });
  return sendSuccess(res, { id: req.params.id });
});
