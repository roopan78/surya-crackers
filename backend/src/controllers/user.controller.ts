import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { normalizeMobile } from '../utils/phone';
import { toUserDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { ListUsersQuery, UpdateUserRoleInput } from '../validators/user.validator';

// GET /api/admin/users — ADMIN + SUPER_ADMIN
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery;

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { mobile: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const pagination = { page: query.page, limit: query.limit };

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.user.count({ where }),
  ]);

  return sendSuccess(res, users.map(toUserDTO), 200, toPaginationMeta(pagination, totalItems));
});

// PATCH /api/admin/users/:id/role — SUPER_ADMIN only
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as UpdateUserRoleInput;

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('User not found');
  }

  const isConfiguredSuperAdmin =
    env.SUPER_ADMIN_MOBILE.length > 0 && existing.mobile === normalizeMobile(env.SUPER_ADMIN_MOBILE);
  if (isConfiguredSuperAdmin && role !== Role.SUPER_ADMIN) {
    throw ApiError.badRequest('The configured super-admin account cannot be downgraded.');
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  return sendSuccess(res, toUserDTO(user));
});
