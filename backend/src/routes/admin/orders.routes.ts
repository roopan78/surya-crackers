import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { listOrdersQuerySchema, orderIdParamsSchema, updateOrderStatusSchema } from '../../validators/order.validator';
import { confirmPaymentManually, listOrders, updateOrderStatus } from '../../controllers/order.controller';

const router = Router();

router.get('/', validate(listOrdersQuerySchema, 'query'), listOrders);
router.patch('/:id/status', validate(orderIdParamsSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/payment', validate(orderIdParamsSchema, 'params'), confirmPaymentManually);

export default router;
