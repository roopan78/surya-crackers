import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { listOrdersQuerySchema, orderIdParamsSchema, updateOrderStatusSchema } from '../../validators/order.validator';
import { listOrders, updateOrderStatus } from '../../controllers/order.controller';

const router = Router();

router.get('/', validate(listOrdersQuerySchema, 'query'), listOrders);
router.patch('/:id/status', validate(orderIdParamsSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
