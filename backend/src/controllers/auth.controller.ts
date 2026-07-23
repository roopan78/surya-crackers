import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { signAdminToken } from '../utils/jwt';
import { LoginInput } from '../validators/auth.validator';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as LoginInput;

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const token = signAdminToken({ sub: admin.id, username: admin.username });

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, {
    token,
    admin: { id: admin.id, username: admin.username },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, { admin: req.admin });
});
