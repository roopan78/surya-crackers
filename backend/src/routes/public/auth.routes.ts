import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticateUser } from '../../middleware/auth.middleware';
import { loginRateLimiter, passwordChangeRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  changePasswordSchema,
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
  changeOwnPassword,
  deactivateOwnAccountHandler,
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
// Rate limiter sits after authenticateUser so it can key on the user, not the IP.
router.post(
  '/change-password',
  authenticateUser,
  passwordChangeRateLimiter,
  validate(changePasswordSchema),
  changeOwnPassword,
);
// No body to validate — the account to switch off is the one the token names.
router.post('/me/deactivate', authenticateUser, deactivateOwnAccountHandler);

export default router;
