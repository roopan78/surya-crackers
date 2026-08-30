import { Router } from 'express';
import categoriesRoutes from './public/categories.routes';
import productsRoutes from './public/products.routes';
import contentRoutes from './public/content.routes';
import ordersRoutes from './public/orders.routes';
import authRoutes from './public/auth.routes';
import searchRoutes from './public/search.routes';
import webhooksRoutes from './public/webhooks.routes';
import appReleaseRoutes from './public/appRelease.routes';
import appReleaseUploadRoutes from './admin/appReleaseUpload.routes';
import adminRoutes from './admin';

const router = Router();

router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/content', contentRoutes);
router.use('/orders', ordersRoutes);
router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/app-release', appReleaseRoutes);

// Ahead of the admin router deliberately, and on the same path: a release token
// is a second way into `POST /admin/app-release` only. Requests that do not
// carry one fall straight back out of it into the session-guarded routes below,
// so nothing about the existing admin auth changes.
router.use('/admin/app-release', appReleaseUploadRoutes);
router.use('/admin', adminRoutes);

export default router;
