import { Role, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { hashPassword, verifyPassword, normalizeEmail } from '../utils/password';
import { signUserToken } from '../utils/jwt';

export interface AuthResult {
  token: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'mobile' | 'role'>;
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function register(
  rawEmail: string,
  password: string,
  name: string,
  mobile?: string,
): Promise<AuthResult> {
  const email = normalizeEmail(rawEmail);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.badRequest('An account with this email already exists. Please log in instead.');
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name,
      mobile,
      role: isSuperAdminEmail(email) ? Role.SUPER_ADMIN : Role.CUSTOMER,
    },
  });

  return toAuthResult(user);
}

export async function login(rawEmail: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });

  // Same message whether the account is missing, Google-only, or the password
  // is wrong — distinguishing them would let an attacker enumerate accounts.
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect email or password.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  return toAuthResult(await ensureSuperAdmin(user));
}

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw ApiError.internal('Google sign-in is not configured.');
  }

  const ticket = await googleClient
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => null);

  const payload = ticket?.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw ApiError.unauthorized('Could not verify your Google account.');
  }

  const email = normalizeEmail(payload.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email,
        googleId: payload.sub,
        name: payload.name ?? null,
        role: isSuperAdminEmail(email) ? Role.SUPER_ADMIN : Role.CUSTOMER,
      },
    });
    return toAuthResult(created);
  }

  if (!existing.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  // Link Google to a pre-existing password account on first Google sign-in.
  const linked = existing.googleId
    ? existing
    : await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } });

  return toAuthResult(await ensureSuperAdmin(linked));
}

function isSuperAdminEmail(email: string): boolean {
  return env.SUPER_ADMIN_EMAIL.length > 0 && email === normalizeEmail(env.SUPER_ADMIN_EMAIL);
}

/** Keeps the configured super-admin at SUPER_ADMIN even if their role was changed. */
async function ensureSuperAdmin(user: User): Promise<User> {
  if (!isSuperAdminEmail(user.email) || user.role === Role.SUPER_ADMIN) {
    return user;
  }
  return prisma.user.update({ where: { id: user.id }, data: { role: Role.SUPER_ADMIN } });
}

function toAuthResult(user: User): AuthResult {
  return {
    token: signUserToken({ sub: user.id, email: user.email, role: user.role }),
    user: { id: user.id, email: user.email, name: user.name, mobile: user.mobile, role: user.role },
  };
}
