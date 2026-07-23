import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminTokenPayload {
  sub: string;
  username: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AdminTokenPayload;
}
