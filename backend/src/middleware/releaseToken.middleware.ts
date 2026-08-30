import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * An alternative credential for publishing the staff Android build.
 *
 * Every other admin route is guarded by a user JWT, which is the right thing:
 * it is short-lived, it names a person, and it only ever exists inside a signed-in
 * browser session. That last property is exactly what makes it useless for
 * releasing — the build machine has no browser, so publishing meant lifting a
 * token out of DevTools by hand for every single release.
 *
 * This is deliberately the narrowest opening that solves that:
 *
 * - **One route, one method.** It is mounted only in front of
 *   `POST /api/admin/app-release`. It cannot read the release metadata, cannot
 *   touch orders, products or users, and cannot be presented anywhere else.
 * - **Opt-in.** With `APP_RELEASE_TOKEN` unset the middleware authorises
 *   nothing and the route behaves exactly as it did before.
 * - **Never a fallback.** A request that offers no token is passed straight back
 *   out to the session-guarded admin router, so the normal path is untouched.
 *   A request that offers a *wrong* token is rejected outright rather than being
 *   allowed to retry as a session request.
 *
 * The worst an attacker holding this secret can do is replace the APK on the
 * download card. That is not nothing — staff install what it serves — so the
 * token wants the same care as a deploy key: long, random, stored only in the
 * host's environment, and rotated if it is ever pasted somewhere it shouldn't be.
 */

const HEADER = 'x-release-token';

/**
 * Short secrets are worse than no secret, because they add an attack surface
 * while implying one exists. 32 characters of base64 is ~192 bits.
 */
const MIN_TOKEN_LENGTH = 32;

export function releaseTokenEnabled(): boolean {
  return env.APP_RELEASE_TOKEN.length >= MIN_TOKEN_LENGTH;
}

/** True when someone has configured a token but made it too weak to enable. */
export function releaseTokenMisconfigured(): boolean {
  return env.APP_RELEASE_TOKEN.length > 0 && !releaseTokenEnabled();
}

/**
 * Constant-time comparison.
 *
 * Both sides are hashed first because `timingSafeEqual` throws when its inputs
 * differ in length — and catching that throw would itself turn the length of
 * the secret into a timing signal. Digests are always 32 bytes, so the
 * comparison is genuinely uniform.
 */
function matchesConfiguredToken(provided: string): boolean {
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(env.APP_RELEASE_TOKEN, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

export function requireReleaseToken(req: Request, _res: Response, next: NextFunction) {
  const provided = req.headers[HEADER];

  // No token offered — an ordinary portal request. Leave this router entirely so
  // the session-guarded admin routes below handle it exactly as before.
  if (typeof provided !== 'string' || provided.length === 0) {
    return next('router');
  }

  // A single message for both "not enabled" and "wrong token": a caller probing
  // with a guess should not learn which of the two it is. The operator gets the
  // answer from the startup log instead.
  if (!releaseTokenEnabled() || !matchesConfiguredToken(provided)) {
    throw ApiError.unauthorized('Invalid release token.');
  }

  next();
}
