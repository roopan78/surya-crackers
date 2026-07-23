import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { toFooterDTO } from '../models/dto';
import { UpdateFooterInput } from '../validators/footer.validator';

const SINGLETON_ID = 1;

// GET /api/admin/footer-config
export const getFooterConfig = asyncHandler(async (_req: Request, res: Response) => {
  const footer = await prisma.footerConfig.findUnique({ where: { id: SINGLETON_ID } });
  return sendSuccess(res, footer ? toFooterDTO(footer) : null);
});

// PUT /api/admin/footer-config — upserts the single row
export const updateFooterConfig = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateFooterInput;
  const footer = await prisma.footerConfig.upsert({
    where: { id: SINGLETON_ID },
    update: input,
    create: { id: SINGLETON_ID, ...input },
  });
  return sendSuccess(res, toFooterDTO(footer));
});
