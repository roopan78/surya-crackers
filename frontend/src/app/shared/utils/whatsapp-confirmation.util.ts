import { Order } from '../../core/models';

/**
 * Builds the "your order is confirmed" message staff send from their own
 * WhatsApp, and the wa.me link that opens it.
 *
 * Deliberately a deep link rather than an API call: it opens the admin's
 * WhatsApp Web with the message typed out, and they press send. The customer
 * therefore hears from the shop's real number, in a thread they can reply to,
 * with no Meta template approval and no per-message cost.
 */

const DEFAULT_COUNTRY_CODE = '91';

/**
 * wa.me needs a full international number with no punctuation, but customer
 * mobiles are stored the way people type them — ten bare digits, sometimes a
 * leading zero or a +91. Returns null when there is nothing usable, so callers
 * can hide the button rather than open a broken chat.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  // Domestic trunk prefix: 0 then the ten-digit number.
  if (digits.length === 11 && digits.startsWith('0')) return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  // Already carries a country code.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatPickup(order: Order): string | null {
  if (!order.pickupDate && !order.pickupTime) return null;
  const parts: string[] = [];
  if (order.pickupDate) {
    const date = new Date(order.pickupDate);
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
    }
  }
  if (order.pickupTime) parts.push(order.pickupTime);
  return parts.length ? parts.join(', ') : null;
}

/** WhatsApp's own markup: *bold*. Kept sparse so it reads as a message, not a form. */
export function buildOrderConfirmationMessage(order: Order, shopName: string): string {
  const pickup = formatPickup(order);
  const lines: string[] = [
    `*Order confirmed — ${order.orderNumber}*`,
    '',
    order.customerName ? `Hi ${order.customerName},` : 'Hi,',
    '',
    'Your order is confirmed and we are keeping it aside for you.',
    '',
    '*Items*',
    ...order.items.map(
      (item) => `• ${item.name} — ${item.boxes} × ${formatRupees(item.price)} = ${formatRupees(item.price * item.boxes)}`,
    ),
    '',
    `*Total: ${formatRupees(order.estimatedTotal)}*`,
  ];

  if (pickup) {
    lines.push('', `*Pickup:* ${pickup}`);
  }

  lines.push(
    '',
    'Payment is collected at the counter when you pick the order up.',
    '',
    `— ${shopName}`,
  );

  return lines.join('\n');
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
