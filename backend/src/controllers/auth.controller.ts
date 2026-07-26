import { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toUserDTO } from '../models/dto';
import { AuthResult, login, loginWithGoogle, register } from '../services/auth.service';
import { GoogleLoginInput, LoginInput, RegisterInput, UpdateProfileInput } from '../validators/auth.validator';

function respondWithSession(res: Response, result: AuthResult) {
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  return sendSuccess(res, result);
}

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, mobile } = req.body as RegisterInput;
  const result = await register(email, password, name, mobile);
  return respondWithSession(res, result);
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;
  return respondWithSession(res, await login(email, password));
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as GoogleLoginInput;
  return respondWithSession(res, await loginWithGoogle(idToken));
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, { user: req.user });
});

// PATCH /api/auth/me — a user updating their own profile (email/role are not self-editable)
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const { name, mobile } = req.body as UpdateProfileInput;
  const user = await prisma.user.update({ where: { id: req.user.sub }, data: { name, mobile } });
  return sendSuccess(res, toUserDTO(user));
});
