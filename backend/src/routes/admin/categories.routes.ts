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

const router = Router();

router.get('/', validate(listCategoriesQuerySchema, 'query'), listAllCategories);
router.get('/:id', validate(categoryIdParamsSchema, 'params'), getCategoryById);
router.post('/', validate(createCategorySchema), createCategory);
router.put('/:id', validate(categoryIdParamsSchema, 'params'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', validate(categoryIdParamsSchema, 'params'), deleteCategory);

export default router;
