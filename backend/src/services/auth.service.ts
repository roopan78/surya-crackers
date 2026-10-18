import { Role, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from '../utils/password';
import { signUserToken } from '../utils/jwt';
import { sendTemporaryPasswordEmail } from './mail.service';

export interface AuthResult {
  token: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'mobile' | 'role' | 'passwordIsTemporary'>;
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
    return toAuthResult(await issueTemporaryPassword(created));
  }

  if (!existing.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  // Link Google to a pre-existing password account on first Google sign-in.
  const linked = existing.googleId
    ? existing
    : await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } });

  return toAuthResult(await issueTemporaryPassword(await ensureSuperAdmin(linked)));
}

/**
 * Gives a Google account a password of its own and emails it over.
 *
 * Google sign-in otherwise leaves `passwordHash` null, so the customer has no
 * way to sign in by email and nothing to change from their profile. This runs
 * on every Google sign-in but does work only while there is no password —
 * which covers accounts created before this existed as well as new ones, and
 * means the mail goes out exactly once per account.
 *
 * The order matters: the hash is stored only *after* the mail is accepted, so a
 * missing SMTP config or a bounced send can never leave someone holding a
 * password they were never told. It also never throws — a mail problem must not
 * cost the customer their sign-in.
 */
async function issueTemporaryPassword(user: User): Promise<User> {
  if (user.passwordHash) {
    return user;
  }

  try {
    const temporaryPassword = generateTemporaryPassword();
    const delivered = await sendTemporaryPasswordEmail(user.email, user.name, temporaryPassword);
    if (!delivered) {
      return user;
    }

    return await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(temporaryPassword), passwordIsTemporary: true },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: 'auth',
        event: 'TEMP_PASSWORD_ISSUE',
        userId: user.id,
        status: 'FAILED',
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    return user;
  }
}

/**
 * Replaces a customer's own password. Verifying the current one matters even
 * though the request is already authenticated: it keeps a borrowed session from
 * being turned into permanent access.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  // Only reachable if the temporary-password mail never went out.
  if (!user.passwordHash) {
    throw ApiError.badRequest(
      'This account does not have a password yet. Sign in with Google and we will email you one.',
    );
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    // 403, not 401: the caller IS authenticated — it is the password typed into
    // the form that is wrong. The frontend's auth interceptor tears the session
    // down on any 401, so a 401 here silently logs a customer out over one typo,
    // taking the "replace your temporary password" notice with it.
    throw ApiError.forbidden('Your current password is incorrect.');
  }

  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('Your new password must be different from your current one.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), passwordIsTemporary: false },
  });
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
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      passwordIsTemporary: user.passwordIsTemporary,
    },
  };
}
