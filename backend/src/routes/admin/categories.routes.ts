import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '../../validators/category.validator';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listAllCategories,
  updateCategory,
} from '../../controllers/category.controller';
import {
  downloadCategoryImportTemplate,
  importCategories,
  previewCategoryImport,
} from '../../controllers/categoryImport.controller';
import { uploadSpreadsheetFile } from '../../middleware/upload.middleware';

const router = Router();

// Bulk spreadsheet import — registered before '/:id' so 'import' is never read as an id.
router.get('/import/template', downloadCategoryImportTemplate);
router.post('/import/preview', uploadSpreadsheetFile, previewCategoryImport);
router.post('/import', uploadSpreadsheetFile, importCategories);

router.get('/', validate(listCategoriesQuerySchema, 'query'), listAllCategories);
router.get('/:id', validate(categoryIdParamsSchema, 'params'), getCategoryById);
router.post('/', validate(createCategorySchema), createCategory);
router.put('/:id', validate(categoryIdParamsSchema, 'params'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', validate(categoryIdParamsSchema, 'params'), deleteCategory);

export default router;
