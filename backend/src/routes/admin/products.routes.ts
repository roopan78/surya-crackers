import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductSchema,
} from '../../validators/product.validator';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listAllProducts,
  updateProduct,
} from '../../controllers/product.controller';

const router = Router();

router.get('/', validate(listProductsQuerySchema, 'query'), listAllProducts);
router.get('/:id', validate(productIdParamsSchema, 'params'), getProductById);
router.post('/', validate(createProductSchema), createProduct);
router.put('/:id', validate(productIdParamsSchema, 'params'), validate(updateProductSchema), updateProduct);
router.delete('/:id', validate(productIdParamsSchema, 'params'), deleteProduct);

export default router;
