import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticateUser } from '../../middleware/auth.middleware';
import { otpRequestRateLimiter } from '../../middleware/rateLimit.middleware';
import { sendOtpSchema, updateProfileSchema, verifyOtpSchema } from '../../validators/auth.validator';
import { sendOtp, verifyOtp, logout, me, updateProfile } from '../../controllers/auth.controller';

const router = Router();

// send-otp/verify-otp are public — this single mechanism logs in customers,
// admins, and the super-admin alike; role is resolved server-side from the User row.
router.post('/send-otp', otpRequestRateLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/logout', authenticateUser, logout);
router.get('/me', authenticateUser, me);
router.patch('/me', authenticateUser, validate(updateProfileSchema), updateProfile);

export default router;
