import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { attachUserIfPresent, authenticateUser } from '../../middleware/auth.middleware';
import { createOrderSchema } from '../../validators/order.validator';
import { createOrder, listMyOrders } from '../../controllers/order.controller';

const router = Router();

// Guest checkout stays the default — attachUserIfPresent resolves req.user
// when a customer is logged in, without requiring it.
router.post('/', attachUserIfPresent, validate(createOrderSchema), createOrder);
router.get('/mine', authenticateUser, listMyOrders);

// No customer-facing payment routes: nothing is paid through this site.

export default router;
