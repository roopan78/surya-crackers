import { Router } from 'express';
import { getHomepageContent } from '../../controllers/content.controller';

const router = Router();

router.get('/homepage', getHomepageContent);

export default router;
