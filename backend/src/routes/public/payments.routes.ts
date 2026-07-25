import { Router } from 'express';
import { listPaymentMethods } from '../../controllers/payment.controller';

const router = Router();

router.get('/methods', listPaymentMethods);

export default router;
