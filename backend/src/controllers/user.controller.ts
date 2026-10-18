import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { normalizeEmail } from '../utils/password';
import { toUserDTO } from '../models/dto';
import { toPaginationMeta, toSkipTake } from '../utils/pagination';
import { ListUsersQuery, UpdateUserRoleInput } from '../validators/user.validator';
import {
  adminDeactivateUser,
  adminReactivateUser,
  deleteUserPermanently,
  listActiveOrders,
} from '../services/account.service';

// GET /api/admin/users — ADMIN + SUPER_ADMIN
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery;

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
            { mobile: { contains: query.search, mode: 'insensitive' } },
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
    env.SUPER_ADMIN_EMAIL.length > 0 && existing.email === normalizeEmail(env.SUPER_ADMIN_EMAIL);
  if (isConfiguredSuperAdmin && role !== Role.SUPER_ADMIN) {
    throw ApiError.badRequest('The configured super-admin account cannot be downgraded.');
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  return sendSuccess(res, toUserDTO(user));
});

// POST /api/admin/users/:id/deactivate — ADMIN + SUPER_ADMIN.
// Refused while the customer still has an order in progress; the rule and the
// role checks live in account.service so self-service and staff share them.
export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const user = await adminDeactivateUser({ sub: req.user.sub, role: req.user.role }, req.params.id);
  return sendSuccess(res, toUserDTO(user));
});

// POST /api/admin/users/:id/reactivate — ADMIN + SUPER_ADMIN
export const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminReactivateUser(req.params.id);
  return sendSuccess(res, toUserDTO(user));
});

// DELETE /api/admin/users/:id — SUPER_ADMIN only. Irreversible: cancels whatever
// is still in progress and removes the account in one transaction.
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const result = await deleteUserPermanently({ sub: req.user.sub }, req.params.id);
  return sendSuccess(res, {
    message: 'Account deleted.',
    cancelledOrders: result.cancelledOrders,
    detachedOrders: result.detachedOrders,
  });
});

// GET /api/admin/users/:id/active-orders — what is blocking a deactivation, so
// the admin screen can say which orders to settle instead of a bare refusal.
export const getUserActiveOrders = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, await listActiveOrders(req.params.id));
});
