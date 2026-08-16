import { Router } from 'express';
import { downloadAppRelease } from '../../controllers/appRelease.controller';

const router = Router();

/**
 * The APK download itself. Public because it is opened by the phone's browser
 * as a plain navigation, which carries no Authorization header — see the
 * controller for why that is an acceptable exposure for this binary.
 */
router.get('/download', downloadAppRelease);

export default router;
