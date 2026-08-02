import { Router } from 'express';
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from '../../controllers/notification.controller';

const router = Router();

// Public by necessity — Meta calls these. The GET handshake is guarded by
// WHATSAPP_VERIFY_TOKEN; the POST only ever updates delivery status by
// provider message id, so it exposes no customer data.
router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', receiveWhatsAppWebhook);

export default router;
