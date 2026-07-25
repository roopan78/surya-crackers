import { z } from 'zod';
import { Role } from '@prisma/client';

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
