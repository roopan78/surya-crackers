import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { listOrdersQuerySchema, orderIdParamsSchema, updateOrderStatusSchema } from '../../validators/order.validator';
import { confirmPaymentManually, listOrders, updateOrderStatus } from '../../controllers/order.controller';
import { listOrderNotifications } from '../../controllers/notification.controller';

const router = Router();

router.get('/', validate(listOrdersQuerySchema, 'query'), listOrders);
router.get('/:id/notifications', validate(orderIdParamsSchema, 'params'), listOrderNotifications);
router.patch('/:id/status', validate(orderIdParamsSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/payment', validate(orderIdParamsSchema, 'params'), confirmPaymentManually);

export default router;
