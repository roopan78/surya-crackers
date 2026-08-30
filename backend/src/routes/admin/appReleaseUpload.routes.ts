import { Router } from 'express';
import { uploadApkFile } from '../../middleware/upload.middleware';
import { requireReleaseToken } from '../../middleware/releaseToken.middleware';
import { uploadAppRelease } from '../../controllers/appRelease.controller';

/**
 * `POST /api/admin/app-release` when it carries a release token.
 *
 * Mounted *ahead* of the admin router in `routes/index.ts`, on the same path, so
 * the URL staff and scripts already use does not change. `requireReleaseToken`
 * calls `next('router')` when no token is offered, which drops the request out
 * of here and into the session-guarded admin router — so this file adds a second
 * way in for one route and changes nothing about the first.
 *
 * Only POST is declared. A GET carrying a valid release token falls through to
 * the admin router and gets the usual 401: the token publishes builds, it does
 * not read anything.
 */
const router = Router();

router.use(requireReleaseToken);
router.post('/', uploadApkFile, uploadAppRelease);

export default router;
