import { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { toUserDTO } from '../models/dto';
import { sendOtp as sendOtpForMobile, verifyOtp as verifyOtpForMobile } from '../services/otp.service';
import { SendOtpInput, UpdateProfileInput, VerifyOtpInput } from '../validators/auth.validator';

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body as SendOtpInput;
  const result = await sendOtpForMobile(mobile);
  return sendSuccess(res, { message: 'OTP sent.', ...result });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, code } = req.body as VerifyOtpInput;
  const { token, user } = await verifyOtpForMobile(mobile, code);

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, { token, user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, { user: req.user });
});

// PATCH /api/auth/me — a user updating their own profile (name only; mobile/role are not self-editable)
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const { name } = req.body as UpdateProfileInput;
  const user = await prisma.user.update({ where: { id: req.user.sub }, data: { name } });
  return sendSuccess(res, toUserDTO(user));
});
