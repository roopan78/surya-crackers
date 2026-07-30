import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { SearchQuery } from '../validators/search.validator';

const CATEGORY_LIMIT = 5;
const PRODUCT_LIMIT = 8;
const POPULAR_CATEGORY_LIMIT = 6;

/**
 * Prisma parameterizes `contains`, so there is no injection surface — but the
 * value still lands inside a LIKE/ILIKE pattern, where `%` and `_` keep their
 * wildcard meaning. Without this, searching "%" would match the entire table.
 * Backslash must be escaped first, since it is the escape character itself.
 */
function escapeLikeWildcards(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// GET /api/search?q=... — public typeahead across categories + products
export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as unknown as SearchQuery;
  const term = escapeLikeWildcards(q);

  // Both sides are independent — run them concurrently rather than serially.
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, name: { contains: term, mode: 'insensitive' } },
      // Only the fields the dropdown renders; no Decimal/text columns pulled needlessly.
      select: { id: true, name: true, slug: true, imagePath: true },
      orderBy: { name: 'asc' },
      take: CATEGORY_LIMIT,
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        imageUrls: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      take: PRODUCT_LIMIT,
    }),
  ]);

  return sendSuccess(res, {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.imagePath ?? '',
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      image: product.imageUrls[0] ?? '',
      categoryName: product.category.name,
      categorySlug: product.category.slug,
    })),
  });
});

// GET /api/search/popular-categories — shown when the search box is empty
export const listPopularCategories = asyncHandler(async (_req: Request, res: Response) => {
  // "Popular" = carries the most live stock. There is no curated flag on
  // Category, and product count is a better proxy than alphabetical order.
  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take: POPULAR_CATEGORY_LIMIT,
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((row) => row.categoryId) }, isActive: true },
    select: { id: true, name: true, slug: true, imagePath: true },
  });

  // groupBy holds the ranking; findMany does not preserve `in` order.
  const rank = new Map(grouped.map((row, index) => [row.categoryId, index]));
  const ranked = categories
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.imagePath ?? '',
    }));

  return sendSuccess(res, ranked);
});
