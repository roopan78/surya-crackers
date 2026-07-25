import { Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { normalizeMobile } from '../utils/phone';
import { generateOtpCode, hashOtpCode, verifyOtpHash } from '../utils/otp';
import { createOtpProvider } from '../providers/otp/otp-provider.factory';
import { signUserToken } from '../utils/jwt';

const MAX_OTP_ATTEMPTS = 5;
const otpProvider = createOtpProvider();

export interface SendOtpResult {
  devCode?: string;
}

export interface VerifyOtpResult {
  token: string;
  user: Pick<User, 'id' | 'mobile' | 'name' | 'role'>;
}

export async function sendOtp(rawMobile: string): Promise<SendOtpResult> {
  const mobile = normalizeMobile(rawMobile);
  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otp.create({ data: { mobile, codeHash, expiresAt } });
  await otpProvider.sendOtp(mobile, code);

  return env.isProduction ? {} : { devCode: code };
}

export async function verifyOtp(rawMobile: string, code: string): Promise<VerifyOtpResult> {
  const mobile = normalizeMobile(rawMobile);

  const otp = await prisma.otp.findFirst({
    where: { mobile, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw ApiError.badRequest('OTP has expired or was not requested. Please request a new one.');
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new OTP.');
  }

  const isValid = await verifyOtpHash(code, otp.codeHash);
  if (!isValid) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Incorrect OTP. Please try again.');
  }

  await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  const user = await findOrCreateUser(mobile);
  const token = signUserToken({ sub: user.id, mobile: user.mobile, role: user.role });

  return { token, user: { id: user.id, mobile: user.mobile, name: user.name, role: user.role } };
}

async function findOrCreateUser(mobile: string): Promise<User> {
  const isSuperAdminMobile =
    env.SUPER_ADMIN_MOBILE.length > 0 && mobile === normalizeMobile(env.SUPER_ADMIN_MOBILE);

  const existing = await prisma.user.findUnique({ where: { mobile } });

  if (!existing) {
    return prisma.user.create({
      data: { mobile, role: isSuperAdminMobile ? Role.SUPER_ADMIN : Role.CUSTOMER },
    });
  }

  // Never downgrade the configured super-admin account, and always (re-)promote
  // it on login in case the mobile number was reassigned to a different role.
  if (isSuperAdminMobile && existing.role !== Role.SUPER_ADMIN) {
    return prisma.user.update({ where: { id: existing.id }, data: { role: Role.SUPER_ADMIN } });
  }

  return existing;
}
