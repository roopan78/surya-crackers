import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { loginRateLimiter } from '../../middleware/rateLimit.middleware';
import { loginSchema } from '../../validators/auth.validator';
import { login, logout, me } from '../../controllers/auth.controller';

const router = Router();

router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);

export default router;
