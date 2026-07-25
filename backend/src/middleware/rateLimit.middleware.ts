import rateLimit from 'express-rate-limit';
import { normalizeMobile } from '../utils/phone';

/** Keyed by mobile number (not just IP) so one phone can't be spammed with OTPs from many IPs, and vice versa. */
export const otpRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const mobile = typeof req.body?.mobile === 'string' ? normalizeMobile(req.body.mobile) : '';
    return mobile || req.ip || 'unknown';
  },
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
});
