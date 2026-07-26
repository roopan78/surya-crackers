import rateLimit from 'express-rate-limit';
import { normalizeEmail } from '../utils/password';

/** Keyed by email (not just IP) so one account can't be brute-forced from many IPs, and vice versa. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
    return email || req.ip || 'unknown';
  },
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
