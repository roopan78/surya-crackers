import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toProductDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { CreateProductInput, ListProductsQuery, UpdateProductInput } from '../validators/product.validator';
import { submitPaths } from '../services/indexnow.service';

const includeCategory = { category: true } satisfies Prisma.ProductInclude;

// GET /api/products — public, active only, filterable + paginated
export const listActiveProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
    ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
  };

  const pagination = { page: query.page, limit: query.limit };

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      include: includeCategory,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.product.count({ where }),
  ]);

  return sendSuccess(res, products.map(toProductDTO), 200, toPaginationMeta(pagination, totalItems));
});

// GET /api/products/:slug — public
export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: includeCategory,
  });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return sendSuccess(res, toProductDTO(product));
});

// GET /api/admin/products — admin, all products (incl. inactive), filterable + paginated
export const listAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;

  const where: Prisma.ProductWhereInput = {
    ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
    ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
  };

  const pagination = { page: query.page, limit: query.limit };

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      include: includeCategory,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.product.count({ where }),
  ]);

  return sendSuccess(res, products.map(toProductDTO), 200, toPaginationMeta(pagination, totalItems));
});

// GET /api/admin/products/:id
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: includeCategory,
  });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return sendSuccess(res, toProductDTO(product));
});

// POST /api/admin/products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateProductInput;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw ApiError.badRequest('categoryId does not reference an existing category');
  }

  const product = await prisma.product.create({
    data: input,
    include: includeCategory,
  });
  submitPaths(['/', `/product/${product.slug}`, `/category/${product.category.slug}`]);
  return sendSuccess(res, toProductDTO(product), 201);
});

// PUT /api/admin/products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateProductInput;

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Product not found');
  }

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw ApiError.badRequest('categoryId does not reference an existing category');
    }
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: input,
    include: includeCategory,
  });
  // Include the previous slug: renaming retires the old URL.
  submitPaths(['/', `/product/${product.slug}`, `/product/${existing.slug}`, `/category/${product.category.slug}`]);
  return sendSuccess(res, toProductDTO(product));
});

// DELETE /api/admin/products/:id
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Product not found');
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  submitPaths(['/', `/product/${existing.slug}`]);
  return sendSuccess(res, { id: req.params.id });
});
