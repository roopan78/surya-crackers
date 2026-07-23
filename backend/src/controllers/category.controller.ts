import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toCategoryDTO } from '../models/dto';
import { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator';

// GET /api/categories — public, active only
export const listActiveCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, categories.map(toCategoryDTO));
});

// GET /api/admin/categories — admin, all categories
export const listAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const { includeInactive } = req.query as unknown as { includeInactive: boolean };
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, categories.map(toCategoryDTO));
});

// GET /api/admin/categories/:id
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return sendSuccess(res, toCategoryDTO(category));
});

// POST /api/admin/categories
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCategoryInput;
  const category = await prisma.category.create({ data: input });
  return sendSuccess(res, toCategoryDTO(category), 201);
});

// PUT /api/admin/categories/:id
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateCategoryInput;
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Category not found');
  }
  const category = await prisma.category.update({ where: { id: req.params.id }, data: input });
  return sendSuccess(res, toCategoryDTO(category));
});

// DELETE /api/admin/categories/:id
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Category not found');
  }

  const productCount = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (productCount > 0) {
    throw ApiError.conflict('Cannot delete a category that still has products. Reassign or remove its products first.');
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  return sendSuccess(res, { id: req.params.id });
});
