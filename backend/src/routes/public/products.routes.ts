import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { listProductsQuerySchema, productSlugParamsSchema } from '../../validators/product.validator';
import { getProductBySlug, listActiveProducts } from '../../controllers/product.controller';

const router = Router();

router.get('/', validate(listProductsQuerySchema, 'query'), listActiveProducts);
router.get('/:slug', validate(productSlugParamsSchema, 'params'), getProductBySlug);

export default router;
