import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { attachUserIfPresent, authenticateUser } from '../../middleware/auth.middleware';
import { createOrderSchema, orderNumberParamsSchema, submitUtrSchema } from '../../validators/order.validator';
import { createOrder, getUpiDetails, listMyOrders, submitUtr } from '../../controllers/order.controller';

const router = Router();

// Guest checkout stays the default — attachUserIfPresent resolves req.user
// when a customer is logged in, without requiring it.
router.post('/', attachUserIfPresent, validate(createOrderSchema), createOrder);
router.get('/mine', authenticateUser, listMyOrders);

// UPI direct payment — public like the rest of the guest order flow; the
// unguessable order number (see utils/orderNumber.ts) is the access token.
router.get('/:orderNumber/upi-details', validate(orderNumberParamsSchema, 'params'), getUpiDetails);
router.post(
  '/:orderNumber/submit-utr',
  validate(orderNumberParamsSchema, 'params'),
  validate(submitUtrSchema),
  submitUtr,
);

export default router;
