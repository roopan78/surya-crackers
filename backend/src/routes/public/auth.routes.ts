import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticateUser } from '../../middleware/auth.middleware';
import { loginRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../../validators/auth.validator';
import {
  registerUser,
  loginUser,
  googleLogin,
  logout,
  me,
  updateProfile,
} from '../../controllers/auth.controller';

const router = Router();

// register/login/google are public — this single mechanism logs in customers,
// admins, and the super-admin alike; role is resolved server-side from the User row.
router.post('/register', loginRateLimiter, validate(registerSchema), registerUser);
router.post('/login', loginRateLimiter, validate(loginSchema), loginUser);
router.post('/google', loginRateLimiter, validate(googleLoginSchema), googleLogin);
router.post('/logout', authenticateUser, logout);
router.get('/me', authenticateUser, me);
router.patch('/me', authenticateUser, validate(updateProfileSchema), updateProfile);

export default router;
