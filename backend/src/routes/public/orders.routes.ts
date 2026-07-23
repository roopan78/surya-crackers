import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { createOrderSchema } from '../../validators/order.validator';
import { createOrder } from '../../controllers/order.controller';

const router = Router();

router.post('/', validate(createOrderSchema), createOrder);

export default router;
