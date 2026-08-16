import { Router } from 'express';
import { uploadApkFile } from '../../middleware/upload.middleware';
import { getAppRelease, uploadAppRelease } from '../../controllers/appRelease.controller';

const router = Router();

// Both sit behind the admin router's authenticate + requireRole(ADMIN,
// SUPER_ADMIN) guard. The matching *download* route is public and lives in
// routes/public/appRelease.routes.ts — a phone's browser cannot attach a
// bearer token to a plain navigation.
router.get('/', getAppRelease);
router.post('/', uploadApkFile, uploadAppRelease);

export default router;
