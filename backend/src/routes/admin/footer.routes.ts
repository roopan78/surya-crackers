import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { updateFooterSchema } from '../../validators/footer.validator';
import { getFooterConfig, updateFooterConfig } from '../../controllers/footer.controller';

const router = Router();

router.get('/', getFooterConfig);
router.put('/', validate(updateFooterSchema), updateFooterConfig);

export default router;
