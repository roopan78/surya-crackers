/**
 * Email bodies styled to match the storefront.
 *
 * Pure rendering — no database, no sending — so the templates can be read and
 * tested on their own. Mail clients are not browsers: everything is tables with
 * inline styles, because flexbox, grid and <style> blocks are unreliable in
 * Outlook and Gmail's clipper. The look is carried by colour, spacing and the
 * same wordmark the site uses, not by the CSS the site uses.
 */

const BRAND = {
  red: '#E63946',
  gold: '#D4AF37',
  charcoal: '#111827',
  ink: '#4B5563',
  inkMuted: '#6B7280',
  page: '#F8F9FB',
  card: '#FFFFFF',
  line: '#ECEDF1',
  greenSoft: '#ECFDF5',
  green: '#047857',
  redSoft: '#FEF2F2',
} as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export interface ShopIdentity {
  shopName: string;
  phone: string;
  whatsappNumber: string;
  licenseNumber: string;
  safetyDisclaimer: string;
  siteUrl: string;
}

export interface OrderLine {
  name: string;
  price: number;
  boxes: number;
  boxQuantity?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName?: string | null;
  items: OrderLine[];
  estimatedTotal: number;
  pickupDate?: Date | string | null;
  pickupTime?: string | null;
  notes?: string | null;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Indian grouping, no decimals — the storefront never shows paise. */
export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatPickup(date?: Date | string | null, time?: string | null): string | null {
  if (!date && !time) return null;
  const parts: string[] = [];
  if (date) {
    const value = date instanceof Date ? date : new Date(date);
    if (!Number.isNaN(value.getTime())) {
      parts.push(
        value.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      );
    }
  }
  if (time) parts.push(time);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * The shell every email shares: tinted page, white card, wordmark, shop footer.
 * `accent` tints the header rule so a cancellation reads differently from a
 * confirmation at a glance, without needing a different layout.
 */
function layout(options: {
  shop: ShopIdentity;
  preheader: string;
  heading: string;
  accent?: string;
  bodyHtml: string;
}): string {
  const { shop, preheader, heading, bodyHtml } = options;
  const accent = options.accent ?? BRAND.red;

  return `
<div style="margin:0;padding:0;background:${BRAND.page};">
  <!-- Preview text: shown in the inbox list, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="padding:4px 4px 16px 4px;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.4px;color:${BRAND.charcoal};">
              Surya <span style="color:${BRAND.red};">Crackers</span>
            </td>
          </tr>

          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:20px;padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:${accent};border-radius:20px 20px 0 0;line-height:4px;font-size:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:28px 28px 8px 28px;font-family:${FONT};">
                    <h1 style="margin:0 0 6px 0;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.charcoal};letter-spacing:-0.3px;">
                      ${escapeHtml(heading)}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px 28px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.ink};">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 8px 4px 8px;font-family:${FONT};font-size:12px;line-height:1.7;color:${BRAND.inkMuted};">
              <div style="font-weight:700;color:${BRAND.charcoal};">${escapeHtml(shop.shopName)}</div>
              <div>Phone ${escapeHtml(shop.phone)}${shop.whatsappNumber ? ` · WhatsApp ${escapeHtml(shop.whatsappNumber)}` : ''}</div>
              ${shop.licenseNumber ? `<div>License No. ${escapeHtml(shop.licenseNumber)}</div>` : ''}
              ${shop.safetyDisclaimer ? `<div style="margin-top:8px;">${escapeHtml(shop.safetyDisclaimer)}</div>` : ''}
              <div style="margin-top:10px;"><a href="${escapeHtml(shop.siteUrl)}" style="color:${BRAND.red};font-weight:600;text-decoration:none;">${escapeHtml(shop.siteUrl.replace(/^https?:\/\//, ''))}</a></div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>`.trim();
}

/** Order number + pickup, in the pill-ish style the site uses for metadata. */
function orderMetaHtml(order: OrderEmailData): string {
  const pickup = formatPickup(order.pickupDate, order.pickupTime);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};border-radius:14px;margin:4px 0 18px 0;">
      <tr>
        <td style="padding:14px 16px;font-family:${FONT};font-size:13px;color:${BRAND.inkMuted};">
          <div>Order number</div>
          <div style="font-size:17px;font-weight:800;color:${BRAND.charcoal};letter-spacing:0.4px;margin-top:2px;">${escapeHtml(order.orderNumber)}</div>
          ${pickup ? `<div style="margin-top:10px;">Pickup</div><div style="font-weight:700;color:${BRAND.charcoal};margin-top:2px;">${escapeHtml(pickup)}</div>` : ''}
        </td>
      </tr>
    </table>`;
}

function itemsTableHtml(order: OrderEmailData): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:14px;color:${BRAND.charcoal};">
          <div style="font-weight:600;">${escapeHtml(item.name)}</div>
          ${item.boxQuantity ? `<div style="font-size:12px;color:${BRAND.inkMuted};margin-top:2px;">${escapeHtml(item.boxQuantity)}</div>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:13px;color:${BRAND.inkMuted};text-align:center;white-space:nowrap;">
          ${item.boxes} × ${formatRupees(item.price)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.charcoal};text-align:right;white-space:nowrap;">
          ${formatRupees(item.price * item.boxes)}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 0 6px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.inkMuted};">Item</td>
        <td style="padding:0 0 6px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.inkMuted};text-align:center;">Qty</td>
        <td style="padding:0 0 6px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.inkMuted};text-align:right;">Amount</td>
      </tr>
      ${rows}
      <tr>
        <td colspan="2" style="padding:14px 0 0 0;font-family:${FONT};font-size:15px;font-weight:800;color:${BRAND.charcoal};">Total</td>
        <td style="padding:14px 0 0 0;font-family:${FONT};font-size:19px;font-weight:800;color:${BRAND.red};text-align:right;">${formatRupees(order.estimatedTotal)}</td>
      </tr>
    </table>`;
}

function itemsText(order: OrderEmailData): string {
  return order.items
    .map((item) => `  ${item.name} — ${item.boxes} × ${formatRupees(item.price)} = ${formatRupees(item.price * item.boxes)}`)
    .join('\n');
}

function greeting(name?: string | null): string {
  return name?.trim() ? `Hi ${name.trim()},` : 'Hi,';
}

function noticeHtml(text: string, tone: 'info' | 'warn'): string {
  const background = tone === 'info' ? BRAND.greenSoft : BRAND.redSoft;
  const color = tone === 'info' ? BRAND.green : BRAND.red;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0 0;">
      <tr><td style="background:${background};border-radius:12px;padding:12px 14px;font-family:${FONT};font-size:13px;line-height:1.6;color:${color};">${text}</td></tr>
    </table>`;
}

// ---------- The three order emails ----------

export function orderConfirmationEmail(order: OrderEmailData, shop: ShopIdentity): RenderedEmail {
  const pickup = formatPickup(order.pickupDate, order.pickupTime);
  const body = `
    <p style="margin:0 0 14px 0;">${escapeHtml(greeting(order.customerName))}</p>
    <p style="margin:0 0 4px 0;">
      We have received your order and it is on hold for you. Our team will call to confirm the
      items and tell you the final amount before you collect them.
    </p>
    ${orderMetaHtml(order)}
    ${itemsTableHtml(order)}
    ${noticeHtml(
      'Nothing has been charged. Payment is collected at the counter when you pick the order up.',
      'info',
    )}`;

  const text = [
    greeting(order.customerName),
    '',
    'We have received your order and it is on hold for you. Our team will call to confirm the items and the final amount before you collect them.',
    '',
    `Order number: ${order.orderNumber}`,
    pickup ? `Pickup: ${pickup}` : '',
    '',
    'Items',
    itemsText(order),
    '',
    `Total: ${formatRupees(order.estimatedTotal)}`,
    '',
    'Nothing has been charged. Payment is collected at the counter when you pick the order up.',
    '',
    `Questions? Call ${shop.phone}.`,
    '',
    `— ${shop.shopName}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    subject: `Order ${order.orderNumber} received — ${shop.shopName}`,
    text,
    html: layout({
      shop,
      preheader: `We have your order ${order.orderNumber}. Total ${formatRupees(order.estimatedTotal)}.`,
      heading: 'Your order is confirmed',
      bodyHtml: body,
    }),
  };
}

export function orderRestructuredEmail(
  order: OrderEmailData,
  shop: ShopIdentity,
  previousTotal?: number,
): RenderedEmail {
  // Only worth mentioning a change in money if it actually moved.
  const movement =
    previousTotal !== undefined && Math.round(previousTotal) !== Math.round(order.estimatedTotal)
      ? `The total has changed from ${formatRupees(previousTotal)} to <strong>${formatRupees(order.estimatedTotal)}</strong>.`
      : 'The total is unchanged.';

  const body = `
    <p style="margin:0 0 14px 0;">${escapeHtml(greeting(order.customerName))}</p>
    <p style="margin:0 0 4px 0;">
      We have had to adjust your order — some items were not available in the quantity you asked
      for. Your order number stays the same. ${movement}
    </p>
    ${orderMetaHtml(order)}
    <p style="margin:0 0 10px 0;font-weight:700;color:${BRAND.charcoal};">Updated items</p>
    ${itemsTableHtml(order)}
    ${noticeHtml(
      `If this does not work for you, call us on ${escapeHtml(shop.phone)} and we will sort it out or cancel the order.`,
      'warn',
    )}`;

  const text = [
    greeting(order.customerName),
    '',
    'We have had to adjust your order — some items were not available in the quantity you asked for. Your order number stays the same.',
    '',
    `Order number: ${order.orderNumber}`,
    '',
    'Updated items',
    itemsText(order),
    '',
    `Total: ${formatRupees(order.estimatedTotal)}`,
    previousTotal !== undefined && Math.round(previousTotal) !== Math.round(order.estimatedTotal)
      ? `(previously ${formatRupees(previousTotal)})`
      : '',
    '',
    `If this does not work for you, call us on ${shop.phone} and we will sort it out or cancel the order.`,
    '',
    `— ${shop.shopName}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    subject: `Order ${order.orderNumber} updated — ${shop.shopName}`,
    text,
    html: layout({
      shop,
      preheader: `Your order ${order.orderNumber} was adjusted. New total ${formatRupees(order.estimatedTotal)}.`,
      heading: 'Your order has been updated',
      accent: BRAND.gold,
      bodyHtml: body,
    }),
  };
}

export function orderCancelledEmail(order: OrderEmailData, shop: ShopIdentity): RenderedEmail {
  const body = `
    <p style="margin:0 0 14px 0;">${escapeHtml(greeting(order.customerName))}</p>
    <p style="margin:0 0 4px 0;">
      Your order has been cancelled and nothing will be prepared for collection. No payment was
      taken, so there is nothing to refund.
    </p>
    ${orderMetaHtml(order)}
    <p style="margin:0 0 10px 0;font-weight:700;color:${BRAND.charcoal};">What was cancelled</p>
    ${itemsTableHtml(order)}
    ${noticeHtml(
      `If this was not expected, call us on ${escapeHtml(shop.phone)} — we can place it again for you.`,
      'warn',
    )}`;

  const text = [
    greeting(order.customerName),
    '',
    'Your order has been cancelled and nothing will be prepared for collection. No payment was taken, so there is nothing to refund.',
    '',
    `Order number: ${order.orderNumber}`,
    '',
    'What was cancelled',
    itemsText(order),
    '',
    `Total was: ${formatRupees(order.estimatedTotal)}`,
    '',
    `If this was not expected, call us on ${shop.phone} — we can place it again for you.`,
    '',
    `— ${shop.shopName}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    subject: `Order ${order.orderNumber} cancelled — ${shop.shopName}`,
    text,
    html: layout({
      shop,
      preheader: `Order ${order.orderNumber} has been cancelled.`,
      heading: 'Your order has been cancelled',
      accent: BRAND.charcoal,
      bodyHtml: body,
    }),
  };
}

/** The Google-sign-up password mail, in the same clothes as the order ones. */
export function temporaryPasswordEmail(
  to: string,
  name: string | null,
  password: string,
  shop: ShopIdentity,
): RenderedEmail {
  const signInUrl = `${shop.siteUrl.replace(/\/$/, '')}/login`;
  const body = `
    <p style="margin:0 0 14px 0;">${escapeHtml(greeting(name))}</p>
    <p style="margin:0 0 4px 0;">
      Your account is ready. You signed in with Google, so we have also set up a password — use it
      if you ever want to sign in with your email address instead.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};border-radius:14px;margin:18px 0;">
      <tr>
        <td style="padding:16px;font-family:${FONT};font-size:13px;color:${BRAND.inkMuted};">
          <div>Email</div>
          <div style="font-weight:700;color:${BRAND.charcoal};margin:2px 0 12px 0;">${escapeHtml(to)}</div>
          <div>Password</div>
          <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:18px;font-weight:700;letter-spacing:1px;color:${BRAND.charcoal};margin-top:2px;">${escapeHtml(password)}</div>
        </td>
      </tr>
    </table>
    <p style="margin:0;">
      This is a temporary password — change it any time from
      <strong>My Profile</strong> once you are signed in.
    </p>
    <p style="margin:18px 0 0 0;">
      <a href="${escapeHtml(signInUrl)}" style="display:inline-block;background:${BRAND.red};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:999px;">Sign in</a>
    </p>
    <p style="margin:18px 0 0 0;font-size:12px;color:${BRAND.inkMuted};">
      If you did not create this account, please ignore this email.
    </p>`;

  const text = [
    greeting(name),
    '',
    `Your ${shop.shopName} account is ready. You signed in with Google, so we have also set up a password for you — use it if you ever want to sign in with your email address instead.`,
    '',
    `Email:    ${to}`,
    `Password: ${password}`,
    '',
    'This is a temporary password. You can change it any time from My Profile once you are signed in.',
    '',
    `Sign in: ${signInUrl}`,
    '',
    'If you did not create this account, please ignore this email.',
    '',
    `— ${shop.shopName}`,
  ].join('\n');

  return {
    subject: `Your ${shop.shopName} password`,
    text,
    html: layout({
      shop,
      preheader: 'Your account password for signing in with email.',
      heading: 'Your account is ready',
      bodyHtml: body,
    }),
  };
}
