import { Router } from 'express';
import { listActiveCategories } from '../../controllers/category.controller';

const router = Router();

router.get('/', listActiveCategories);

export default router;
