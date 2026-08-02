import { NotificationChannelType } from '@prisma/client';
import { env } from '../config/env';
import {
  ChannelSendResult,
  NotificationChannel,
  TemplateMessage,
} from '../providers/notification/notification-channel.interface';

/**
 * WhatsApp Business Cloud API (Meta Graph) channel. Every piece of WhatsApp
 * wire knowledge lives here — endpoint, payload shape, auth header, error
 * decoding and retry policy — so the rest of the app only deals in
 * NotificationChannel.
 *
 * Only pre-approved template messages are sent: outside a 24-hour customer
 * service window Meta rejects free-form text, and order notifications are
 * business-initiated by definition.
 */

const GRAPH_API_VERSION = 'v21.0';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/** Meta throttling + transient server faults are worth retrying; 4xx are not. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } };
}

interface GraphSendBody {
  messages?: { id: string }[];
}

export class WhatsAppService implements NotificationChannel {
  readonly type = NotificationChannelType.WHATSAPP;

  isConfigured(): boolean {
    return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(message: TemplateMessage): Promise<ChannelSendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'WhatsApp is not configured', attempts: 0 };
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: 'template',
      template: {
        name: message.templateName,
        language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          {
            type: 'body',
            parameters: message.bodyParams.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };

    let lastError = 'Unknown error';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok) {
          const body = (await response.json()) as GraphSendBody;
          return { success: true, messageId: body.messages?.[0]?.id, attempts: attempt };
        }

        const body = (await response.json().catch(() => ({}))) as GraphErrorBody;
        lastError = `HTTP ${response.status}: ${body.error?.message ?? response.statusText}${
          body.error?.error_data?.details ? ` (${body.error.error_data.details})` : ''
        }`;

        // A rejected template or bad recipient will be rejected identically on
        // every retry — only back off for throttling/transient faults.
        if (!isRetryableStatus(response.status)) {
          return { success: false, error: lastError, attempts: attempt };
        }
      } catch (error) {
        // Network failure or timeout — always worth another attempt.
        lastError = error instanceof Error ? error.message : String(error);
      }

      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }

    return { success: false, error: lastError, attempts: MAX_ATTEMPTS };
  }
}

export const whatsAppService = new WhatsAppService();
