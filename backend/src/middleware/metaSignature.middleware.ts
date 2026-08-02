import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Raw request bytes, captured in app.ts for /api/webhooks/* only. */
      rawBody?: Buffer;
    }
  }
}

const SIGNATURE_HEADER = 'x-hub-signature-256';
const SIGNATURE_PREFIX = 'sha256=';

function warn(reason: string, extra: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ scope: 'webhook', event: 'SIGNATURE', reason, ...extra }));
}

/**
 * Verifies Meta's X-Hub-Signature-256 header: HMAC-SHA256 of the raw request
 * body keyed with the app secret. Without this, anyone who learns the webhook
 * URL could post forged delivery receipts.
 *
 * While WHATSAPP_APP_SECRET is unset the check is skipped with a warning, so
 * the endpoint can be registered with Meta before the secret is deployed. Once
 * the secret exists, an absent or wrong signature is a hard 403.
 */
export function verifyMetaSignature(req: Request, _res: Response, next: NextFunction): void {
  if (!env.WHATSAPP_APP_SECRET) {
    warn('WHATSAPP_APP_SECRET is not set — skipping signature verification');
    return next();
  }

  const header = req.get(SIGNATURE_HEADER);
  if (!header?.startsWith(SIGNATURE_PREFIX)) {
    warn('Missing or malformed X-Hub-Signature-256 header');
    return next(ApiError.forbidden('Invalid webhook signature'));
  }

  if (!req.rawBody) {
    // Would mean the raw-body capture in app.ts stopped matching this path.
    warn('Raw body unavailable — cannot verify signature');
    return next(ApiError.forbidden('Invalid webhook signature'));
  }

  const expected = crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(req.rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(header.slice(SIGNATURE_PREFIX.length), 'hex');
  } catch {
    warn('Signature header is not valid hex');
    return next(ApiError.forbidden('Invalid webhook signature'));
  }

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    warn('Signature mismatch — payload rejected');
    return next(ApiError.forbidden('Invalid webhook signature'));
  }

  next();
}
