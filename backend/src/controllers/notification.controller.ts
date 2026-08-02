import { Request, Response } from 'express';
import { NotificationStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { DeliveryStatusOutcome, applyDeliveryStatus } from '../services/notification.service';

/** Meta's status vocabulary -> ours. 'sent' never downgrades a later status. */
const STATUS_MAP: Record<string, NotificationStatus> = {
  sent: NotificationStatus.SENT,
  delivered: NotificationStatus.DELIVERED,
  read: NotificationStatus.READ,
  failed: NotificationStatus.FAILED,
};

interface WebhookBody {
  entry?: {
    changes?: {
      value?: {
        statuses?: {
          id: string;
          status: string;
          errors?: { title?: string; message?: string }[];
        }[];
      };
    }[];
  }[];
}

// GET /api/webhooks/whatsapp — Meta's subscription handshake
export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge ?? ''));
  }
  return res.sendStatus(403);
};

// POST /api/webhooks/whatsapp — delivery receipts (sent/delivered/read/failed).
// Signature-verified upstream by verifyMetaSignature.
export const receiveWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as WebhookBody;
  const tally: Record<DeliveryStatusOutcome | 'ignored', number> = {
    updated: 0,
    duplicate: 0,
    unknown: 0,
    error: 0,
    ignored: 0,
  };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapped = STATUS_MAP[status.status];
        if (!mapped) {
          // Unrecognized status verb, or an inbound customer message rather
          // than a receipt — neither is an error, we simply have no use for it.
          tally.ignored += 1;
          continue;
        }
        const failure = status.errors?.[0];
        const outcome = await applyDeliveryStatus(
          status.id,
          mapped,
          failure ? `${failure.title ?? 'Error'}: ${failure.message ?? ''}`.trim() : undefined,
        );
        tally[outcome] += 1;
      }
    }
  }

  if (tally.updated + tally.duplicate + tally.unknown + tally.error > 0) {
    console.info(JSON.stringify({ scope: 'webhook', event: 'WHATSAPP_STATUS_BATCH', ...tally }));
  }

  // Always 200 — a non-2xx makes Meta retry the same batch indefinitely, and
  // every event above has already been handled or deliberately ignored.
  return res.sendStatus(200);
});

// GET /api/admin/orders/:id/notifications — delivery history for one order
export const listOrderNotifications = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.orderLedger.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const notifications = await prisma.notificationLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, notifications);
});
