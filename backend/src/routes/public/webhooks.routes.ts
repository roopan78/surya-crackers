import { Router } from 'express';
import { verifyMetaSignature } from '../../middleware/metaSignature.middleware';
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from '../../controllers/notification.controller';

const router = Router();

// Public by necessity — Meta calls these. The GET handshake is guarded by
// WHATSAPP_VERIFY_TOKEN; the POST is authenticated by the X-Hub-Signature-256
// HMAC over the raw body, so forged receipts are rejected before any DB work.
router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', verifyMetaSignature, receiveWhatsAppWebhook);

export default router;
