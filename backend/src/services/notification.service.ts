import { NotificationChannelType, NotificationStatus, PaymentProviderType, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { toDisplayPhone, toE164 } from '../utils/phone';
import { NotificationChannel } from '../providers/notification/notification-channel.interface';
import { whatsAppService } from './whatsapp.service';

/**
 * Channel-agnostic notification orchestration:
 *
 *   order.controller -> NotificationService -> NotificationChannel -> provider API
 *
 * Responsibilities kept here (so channels stay dumb transports): resolving the
 * recipient, validating/normalizing the number, building template variables,
 * claiming the duplicate guard, persisting the NotificationLog row and
 * swallowing every failure. Callers get a result they are free to ignore —
 * a notification must never affect the outcome of an order.
 */

export type NotificationEvent =
  | 'ORDER_CREATED'
  | 'ORDER_FAILED'
  // Wired up when the matching Meta templates are approved — each one needs a
  // registry entry below and a call site, nothing more.
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_VERIFIED'
  | 'READY_FOR_PICKUP'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELIVERED';

export interface OrderNotificationContext {
  orderId?: string | null;
  orderNumber: string;
  customerName?: string | null;
  customerMobile?: string | null;
  estimatedTotal?: number;
  paymentProvider?: PaymentProviderType;
  paymentStatus?: PaymentStatus;
  pickupDate?: Date | string | null;
  pickupTime?: string | null;
  createdAt?: Date;
  /** ORDER_FAILED only — the customer-facing explanation. */
  reason?: string;
}

export interface NotificationResult {
  status: NotificationStatus;
  messageId?: string;
  reason?: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentProviderType, string> = {
  CASH_ON_PICKUP: 'Cash on Pickup',
  UPI_DIRECT: 'UPI / QR Payment',
  PHONEPE: 'PhonePe',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  AWAITING_VERIFICATION: 'Awaiting verification',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const STORE_FALLBACK = { name: 'Surya Crackers', phone: '' };

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return 'To be confirmed';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? 'To be confirmed'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(value: number | undefined): string {
  return (value ?? 0).toFixed(2);
}

/** Store identity for template variables — admin-editable via footer config. */
async function getStoreIdentity(): Promise<{ name: string; phone: string }> {
  try {
    const footer = await prisma.footerConfig.findUnique({ where: { id: 1 } });
    return {
      name: footer?.shopName || STORE_FALLBACK.name,
      phone: footer?.phone || STORE_FALLBACK.phone,
    };
  } catch {
    return STORE_FALLBACK;
  }
}

interface EventDefinition {
  templateName: string;
  /**
   * Positional body variables. The order here MUST match the {{1}}, {{2}}…
   * numbering of the approved Meta template — see docs/whatsapp-templates.md.
   */
  buildParams(context: OrderNotificationContext, store: { name: string; phone: string }): string[];
}

const EVENT_REGISTRY: Partial<Record<NotificationEvent, EventDefinition>> = {
  ORDER_CREATED: {
    templateName: env.WHATSAPP_TEMPLATE_ORDER_SUCCESS,
    buildParams: (context, store) => [
      context.customerName?.trim() || 'Customer', // {{1}} customer_name
      context.orderNumber, // {{2}} order_number
      formatDate(context.createdAt ?? new Date()), // {{3}} order_date
      formatAmount(context.estimatedTotal), // {{4}} amount
      context.paymentProvider ? PAYMENT_METHOD_LABELS[context.paymentProvider] : 'Not selected', // {{5}} payment_method
      context.paymentStatus ? PAYMENT_STATUS_LABELS[context.paymentStatus] : 'Pending', // {{6}} payment_status
      formatDate(context.pickupDate), // {{7}} pickup_date
      context.pickupTime?.trim() || 'To be confirmed', // {{8}} pickup_time
      store.name, // {{9}} store_name
      store.phone, // {{10}} store_phone
    ],
  },
  ORDER_FAILED: {
    templateName: env.WHATSAPP_TEMPLATE_ORDER_FAILED,
    buildParams: (context, store) => [
      context.customerName?.trim() || 'Customer', // {{1}} customer_name
      context.orderNumber, // {{2}} order_number
      context.reason?.trim() || 'We could not process your order.', // {{3}} reason
      store.phone, // {{4}} support_phone
    ],
  },
};

function resolveChannel(type: NotificationChannelType): NotificationChannel | null {
  switch (type) {
    case NotificationChannelType.WHATSAPP:
      return whatsAppService;
    // SMS / EMAIL / PUSH: add the implementation and return it here.
    default:
      return null;
  }
}

function logLine(event: NotificationEvent, context: OrderNotificationContext, fields: Record<string, unknown>): string {
  return JSON.stringify({
    scope: 'notification',
    event,
    orderNumber: context.orderNumber,
    ...fields,
  });
}

/**
 * Sends one notification for an order event. Never throws: every failure path
 * resolves to a status the caller may log and ignore.
 */
export async function sendOrderNotification(
  event: NotificationEvent,
  context: OrderNotificationContext,
  channelType: NotificationChannelType = NotificationChannelType.WHATSAPP,
): Promise<NotificationResult> {
  try {
    const definition = EVENT_REGISTRY[event];
    if (!definition) {
      return { status: NotificationStatus.SKIPPED, reason: `No template registered for ${event}` };
    }

    const channel = resolveChannel(channelType);
    const recipient = toE164(context.customerMobile);

    // Nothing to send to, or no credentials: record the decision and move on.
    if (!recipient || !channel || !channel.isConfigured()) {
      const reason = !recipient
        ? 'Invalid or missing customer mobile number'
        : !channel
          ? `No implementation for channel ${channelType}`
          : 'WhatsApp is not configured';
      console.warn(logLine(event, context, { status: 'SKIPPED', reason }));
      await recordSkipped(event, context, channelType, definition.templateName, recipient, reason);
      return { status: NotificationStatus.SKIPPED, reason };
    }

    // Duplicate guard: claim the (orderId, event, channel) slot before calling
    // the provider. A concurrent or retried request hits the unique index and
    // bails out here instead of sending the customer a second message.
    let logId: string;
    try {
      const created = await prisma.notificationLog.create({
        data: {
          orderId: context.orderId ?? null,
          orderNumber: context.orderNumber,
          event,
          channel: channelType,
          templateName: definition.templateName,
          recipient: toDisplayPhone(recipient),
          status: NotificationStatus.PENDING,
        },
      });
      logId = created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { status: NotificationStatus.SKIPPED, reason: 'Already sent for this order' };
      }
      throw error;
    }

    const store = await getStoreIdentity();
    const result = await channel.send({
      to: recipient,
      templateName: definition.templateName,
      bodyParams: definition.buildParams(context, store),
    });

    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        providerMessageId: result.messageId ?? null,
        failureReason: result.success ? null : (result.error ?? 'Unknown error'),
        attempts: result.attempts,
      },
    });

    console[result.success ? 'info' : 'error'](
      logLine(event, context, {
        status: result.success ? 'SENT' : 'FAILED',
        channel: channelType,
        template: definition.templateName,
        recipient: toDisplayPhone(recipient),
        messageId: result.messageId,
        attempts: result.attempts,
        ...(result.success ? {} : { failureReason: result.error }),
      }),
    );

    return result.success
      ? { status: NotificationStatus.SENT, messageId: result.messageId }
      : { status: NotificationStatus.FAILED, reason: result.error };
  } catch (error) {
    // Last line of defence — a notification bug must not surface to the customer.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(logLine(event, context, { status: 'FAILED', failureReason: reason }));
    return { status: NotificationStatus.FAILED, reason };
  }
}

async function recordSkipped(
  event: NotificationEvent,
  context: OrderNotificationContext,
  channel: NotificationChannelType,
  templateName: string,
  recipient: string | null,
  reason: string,
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        orderId: context.orderId ?? null,
        orderNumber: context.orderNumber,
        event,
        channel,
        templateName,
        recipient: recipient ? toDisplayPhone(recipient) : (context.customerMobile ?? ''),
        status: NotificationStatus.SKIPPED,
        failureReason: reason,
      },
    });
  } catch {
    /* Unique-constraint hit means it was already handled — nothing to record. */
  }
}

/**
 * Fire-and-forget wrapper for request handlers: starts the notification and
 * returns immediately so the HTTP response is never delayed or endangered by it.
 */
export function queueOrderNotification(event: NotificationEvent, context: OrderNotificationContext): void {
  void sendOrderNotification(event, context);
}

/** Delivery-status webhook updates (sent/delivered/read/failed) from Meta. */
export async function applyDeliveryStatus(
  providerMessageId: string,
  status: NotificationStatus,
  failureReason?: string,
): Promise<void> {
  try {
    await prisma.notificationLog.updateMany({
      where: { providerMessageId },
      data: { status, ...(failureReason ? { failureReason } : {}) },
    });
  } catch (error) {
    console.error(
      JSON.stringify({ scope: 'notification', event: 'WEBHOOK_STATUS', providerMessageId, error: String(error) }),
    );
  }
}
