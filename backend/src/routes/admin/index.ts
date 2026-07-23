import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware';
import authRoutes from './auth.routes';
import categoriesRoutes from './categories.routes';
import productsRoutes from './products.routes';
import carouselRoutes from './carousel.routes';
import footerRoutes from './footer.routes';
import ordersRoutes from './orders.routes';

const router = Router();

// Login is public; every other admin route requires a valid admin JWT.
router.use('/auth', authRoutes);
router.use('/categories', authenticateJWT, categoriesRoutes);
router.use('/products', authenticateJWT, productsRoutes);
router.use('/carousel', authenticateJWT, carouselRoutes);
router.use('/footer-config', authenticateJWT, footerRoutes);
router.use('/orders', authenticateJWT, ordersRoutes);

export default router;
