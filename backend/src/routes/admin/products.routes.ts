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
import {
  downloadImportTemplate,
  importProducts,
  previewProductImport,
} from '../../controllers/productImport.controller';
import { uploadExcelFile } from '../../middleware/upload.middleware';

const router = Router();

// Bulk Excel import — registered before '/:id' so 'import' is never read as an id.
router.get('/import/template', downloadImportTemplate);
router.post('/import/preview', uploadExcelFile, previewProductImport);
router.post('/import', uploadExcelFile, importProducts);

router.get('/', validate(listProductsQuerySchema, 'query'), listAllProducts);
router.get('/:id', validate(productIdParamsSchema, 'params'), getProductById);
router.post('/', validate(createProductSchema), createProduct);
router.put('/:id', validate(productIdParamsSchema, 'params'), validate(updateProductSchema), updateProduct);
router.delete('/:id', validate(productIdParamsSchema, 'params'), deleteProduct);

export default router;
