import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { bannerIdParamsSchema, createBannerSchema, updateBannerSchema } from '../../validators/carousel.validator';
import {
  createBanner,
  deleteBanner,
  getBannerById,
  listAllBanners,
  updateBanner,
} from '../../controllers/carousel.controller';

const router = Router();

router.get('/', listAllBanners);
router.get('/:id', validate(bannerIdParamsSchema, 'params'), getBannerById);
router.post('/', validate(createBannerSchema), createBanner);
router.put('/:id', validate(bannerIdParamsSchema, 'params'), validate(updateBannerSchema), updateBanner);
router.delete('/:id', validate(bannerIdParamsSchema, 'params'), deleteBanner);

export default router;
