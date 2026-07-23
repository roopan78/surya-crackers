import { CartItem, OrderDetails } from '../../core/models';

/**
 * Builds a clean, double-spaced plain-text invoice payload for a WhatsApp
 * order message. Kept as a pure function so it's trivially testable and
 * has no Angular/DI dependencies.
 */
export function buildWhatsAppOrderMessage(
  shopName: string,
  items: CartItem[],
  order: OrderDetails,
  grandTotal: number,
): string {
  const lines: string[] = [];

  lines.push(`*New Order — ${shopName}*`);
  lines.push('');
  lines.push('*Items*');
  lines.push('');

  for (const item of items) {
    const lineTotal = item.product.price * item.boxes;
    lines.push(`${item.product.name}`);
    lines.push(`  ${item.boxes} x ${item.product.boxQuantity} @ ₹${item.product.price} = ₹${lineTotal}`);
    lines.push('');
  }

  lines.push(`*Grand Total: ₹${grandTotal}*`);
  lines.push('');
  lines.push('*Delivery Details*');
  lines.push('');
  lines.push(`Name: ${order.name}`);
  lines.push('');
  lines.push(`Address: ${order.address}`);
  lines.push('');
  lines.push(`Phone: ${order.phone}`);
  lines.push('');
  lines.push(`Target Date: ${order.targetDate}`);

  return lines.join('\n');
}

/**
 * Safely encodes the invoice payload and opens the admin's WhatsApp chat
 * (wa.me deep link) in a new tab with the message pre-filled.
 */
export function openWhatsAppOrder(whatsappNumber: string, message: string): void {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
