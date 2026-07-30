import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { searchQuerySchema } from '../../validators/search.validator';
import { globalSearch, listPopularCategories } from '../../controllers/search.controller';

const router = Router();

// Declared before '/' so the literal path is not shadowed by the query route.
router.get('/popular-categories', listPopularCategories);
router.get('/', validate(searchQuerySchema, 'query'), globalSearch);

export default router;
