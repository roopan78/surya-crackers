import { Router } from 'express';
import categoriesRoutes from './public/categories.routes';
import productsRoutes from './public/products.routes';
import contentRoutes from './public/content.routes';
import ordersRoutes from './public/orders.routes';
import authRoutes from './public/auth.routes';
import searchRoutes from './public/search.routes';
import webhooksRoutes from './public/webhooks.routes';
import adminRoutes from './admin';

const router = Router();

router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/content', contentRoutes);
router.use('/orders', ordersRoutes);
router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/admin', adminRoutes);

export default router;
