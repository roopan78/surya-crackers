import { Router } from 'express';
import { getUploadSignature } from '../../controllers/upload.controller';

const router = Router();

// Mounted under /api/admin, so authenticateUser + requireRole already applied.
router.post('/signature', getUploadSignature);

export default router;
