import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticateUser, requireRole } from '../../middleware/auth.middleware';
import categoriesRoutes from './categories.routes';
import productsRoutes from './products.routes';
import carouselRoutes from './carousel.routes';
import footerRoutes from './footer.routes';
import ordersRoutes from './orders.routes';
import usersRoutes from './users.routes';
import uploadsRoutes from './uploads.routes';

const router = Router();

// Login lives under the public /api/auth/* routes now (one OTP mechanism for
// every role). Everything here requires a valid session and an ADMIN/SUPER_ADMIN
// role, except /users, which further restricts role-changes to SUPER_ADMIN
// (enforced per-route inside users.routes.ts).
router.use(authenticateUser, requireRole(Role.ADMIN, Role.SUPER_ADMIN));

router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/carousel', carouselRoutes);
router.use('/footer-config', footerRoutes);
router.use('/orders', ordersRoutes);
router.use('/users', usersRoutes);
router.use('/uploads', uploadsRoutes);

export default router;
