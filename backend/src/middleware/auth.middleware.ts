import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { AdminTokenPayload, verifyAdminToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  if (req.cookies?.token) {
    return req.cookies.token as string;
  }
  return null;
}

export function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired authentication token');
  }
}
