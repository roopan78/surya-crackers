import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import {
  OrderEmailData,
  RenderedEmail,
  ShopIdentity,
  orderCancelledEmail,
  orderConfirmationEmail,
  orderRestructuredEmail,
  temporaryPasswordEmail,
} from './emailTemplates';

/**
 * Transactional email over plain SMTP.
 *
 * Deliberately kept outside the NotificationChannel pipeline in
 * notification.service.ts: that one is built around Meta-approved WhatsApp
 * *templates* keyed to an order (its NotificationLog rows require an order
 * number). Account mail has no order and no provider-side template, so forcing
 * it through there would mean bending both models. It shares the same house
 * rule instead — never throw, and report whether the send happened.
 */

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always sent, so the mail reads fine without HTML. */
  text: string;
  html?: string;
}

let cachedTransporter: Transporter | null = null;

/** HTTPS delivery is preferred wherever it is configured — see sendViaZeptoMail. */
function zeptoMailConfigured(): boolean {
  return Boolean(env.ZEPTOMAIL_TOKEN);
}

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

/** False when no transport is set up — every send is then skipped. */
export function isMailConfigured(): boolean {
  return zohoMailConfigured() || zeptoMailConfigured() || smtpConfigured();
}

/**
 * Splits a MAIL_FROM header into the parts ZeptoMail wants separately.
 * 'Surya Crackers <info@shop.com>' -> { address: 'info@shop.com', name: 'Surya Crackers' }
 */
function parseFrom(value: string): { address: string; name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (match) {
    return { address: match[2].trim(), name: match[1].replace(/^"|"$/g, '').trim() || undefined };
  }
  return { address: value.trim() };
}

/**
 * Sends over ZeptoMail's HTTPS API rather than SMTP.
 *
 * Necessary, not merely tidy: this host cannot open an outbound SMTP connection
 * to Zoho at all — 587 and 465 both time out — so the only way mail leaves the
 * server is over 443, the same path everything else already uses.
 */
async function sendViaZeptoMail(message: MailMessage): Promise<boolean> {
  const from = parseFrom(env.MAIL_FROM || env.SMTP_USER);
  try {
    const response = await fetch(env.ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        // ZeptoMail's own scheme — the token already carries the prefix on some
        // accounts, so it is only added when missing.
        Authorization: env.ZEPTOMAIL_TOKEN.startsWith('Zoho-enczapikey')
          ? env.ZEPTOMAIL_TOKEN
          : `Zoho-enczapikey ${env.ZEPTOMAIL_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: { address: from.address, name: from.name },
        to: [{ email_address: { address: message.to } }],
        subject: message.subject,
        textbody: message.text,
        htmlbody: message.html,
      }),
      // Same reasoning as the SMTP timeouts: a hung provider must cost seconds.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(
        logLine({
          status: 'FAILED',
          via: 'zeptomail',
          subject: message.subject,
          reason: `HTTP ${response.status}`,
          detail: detail.slice(0, 300),
        }),
      );
      return false;
    }

    console.info(logLine({ status: 'SENT', via: 'zeptomail', subject: message.subject }));
    return true;
  } catch (error) {
    console.error(
      logLine({
        status: 'FAILED',
        via: 'zeptomail',
        subject: message.subject,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

function getTransporter(): Transporter | null {
  if (!smtpConfigured()) {
    return null;
  }
  cachedTransporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    // Nodemailer waits two minutes by default before giving up on a connection.
    // A host that silently drops outbound SMTP — which is how this first broke
    // in production — then holds the caller for that long. Fail in seconds.
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });
  return cachedTransporter;
}

function logLine(fields: Record<string, unknown>): string {
  return JSON.stringify({ scope: 'mail', ...fields });
}

/**
 * Sends one email. Resolves to whether it actually went out — callers decide
 * what an unsent mail means for them; it never throws.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  // HTTPS transports first — SMTP is unreachable from some hosts, including
  // this one in production, so it is the last resort rather than the default.
  if (zohoMailConfigured()) {
    return sendViaZohoMail(message);
  }
  if (zeptoMailConfigured()) {
    return sendViaZeptoMail(message);
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(logLine({ status: 'SKIPPED', subject: message.subject, reason: 'No mail transport is configured' }));
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    console.info(logLine({ status: 'SENT', via: 'smtp', subject: message.subject, messageId: info.messageId }));
    return true;
  } catch (error) {
    console.error(
      logLine({
        status: 'FAILED',
        via: 'smtp',
        subject: message.subject,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

// ---------- Zoho Mail API (HTTPS) ----------

/**
 * Sends through an ordinary Zoho mailbox over the Mail API.
 *
 * Same reason as ZeptoMail — this host cannot open outbound SMTP — but it needs
 * no extra product: it posts as the mailbox that already exists. The cost is
 * OAuth: a long-lived refresh token mints short-lived access tokens, which are
 * cached until shortly before they expire.
 */
function zohoMailConfigured(): boolean {
  return Boolean(
    env.ZOHO_MAIL_CLIENT_ID && env.ZOHO_MAIL_CLIENT_SECRET && env.ZOHO_MAIL_REFRESH_TOKEN,
  );
}

let cachedAccessToken: { value: string; expiresAt: number } | null = null;
/** The mailbox's numeric account id, part of the send URL. Looked up once. */
let cachedAccountId: string | null = null;

async function getZohoAccessToken(): Promise<string> {
  // 60s of slack so a token cannot expire between the check and the send.
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.ZOHO_MAIL_CLIENT_ID,
    client_secret: env.ZOHO_MAIL_CLIENT_SECRET,
    refresh_token: env.ZOHO_MAIL_REFRESH_TOKEN,
  });

  const res = await fetch(`${env.ZOHO_ACCOUNTS_HOST}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`token refresh failed: HTTP ${res.status} ${data.error ?? ''}`.trim());
  }

  cachedAccessToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.value;
}

async function getZohoAccountId(accessToken: string): Promise<string> {
  if (cachedAccountId) {
    return cachedAccountId;
  }

  const res = await fetch(`${env.ZOHO_MAIL_API_HOST}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: Array<{ accountId?: string }> };
  const accountId = data.data?.[0]?.accountId;
  if (!res.ok || !accountId) {
    throw new Error(`account lookup failed: HTTP ${res.status}`);
  }

  cachedAccountId = String(accountId);
  return cachedAccountId;
}

async function sendViaZohoMail(message: MailMessage): Promise<boolean> {
  try {
    const accessToken = await getZohoAccessToken();
    const accountId = await getZohoAccountId(accessToken);
    const from = env.ZOHO_MAIL_FROM || parseFrom(env.MAIL_FROM || env.SMTP_USER).address;

    const res = await fetch(`${env.ZOHO_MAIL_API_HOST}/api/accounts/${accountId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: from,
        toAddress: message.to,
        subject: message.subject,
        // The API carries one body; the HTML version is the richer one and every
        // mail client in practice renders it.
        content: message.html ?? message.text,
        mailFormat: message.html ? 'html' : 'plaintext',
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(
        logLine({
          status: 'FAILED',
          via: 'zohomail',
          subject: message.subject,
          reason: `HTTP ${res.status}`,
          detail: detail.slice(0, 300),
        }),
      );
      return false;
    }

    console.info(logLine({ status: 'SENT', via: 'zohomail', subject: message.subject }));
    return true;
  } catch (error) {
    // A stale cached token would otherwise keep failing until the next restart.
    cachedAccessToken = null;
    console.error(
      logLine({
        status: 'FAILED',
        via: 'zohomail',
        subject: message.subject,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

/**
 * Shop identity for the mail bodies — admin-editable via footer config, with
 * fallbacks so a database hiccup cannot stop an email going out.
 */
async function getShopIdentity(): Promise<ShopIdentity> {
  const fallback: ShopIdentity = {
    shopName: 'Surya Crackers',
    phone: '',
    whatsappNumber: '',
    licenseNumber: '',
    safetyDisclaimer: '',
    siteUrl: env.PUBLIC_SITE_URL,
  };
  try {
    const footer = await prisma.footerConfig.findUnique({ where: { id: 1 } });
    if (!footer) return fallback;
    return {
      shopName: footer.shopName || fallback.shopName,
      phone: footer.phone || '',
      whatsappNumber: footer.whatsappNumber || '',
      licenseNumber: footer.licenseNumber || '',
      safetyDisclaimer: footer.safetyDisclaimer || '',
      siteUrl: env.PUBLIC_SITE_URL,
    };
  } catch {
    return fallback;
  }
}

async function send(rendered: RenderedEmail, to: string): Promise<boolean> {
  return sendMail({ to, subject: rendered.subject, text: rendered.text, html: rendered.html });
}

/**
 * Tells a customer the password we generated for them. Sent once, when an
 * account signs in with Google and has no password of its own yet.
 */
export async function sendTemporaryPasswordEmail(
  to: string,
  name: string | null,
  temporaryPassword: string,
): Promise<boolean> {
  const shop = await getShopIdentity();
  return send(temporaryPasswordEmail(to, name, temporaryPassword, shop), to);
}

/**
 * Order mail goes only to registered customers: a guest checkout collects a
 * name and a mobile number, never an address to write to. Callers pass null in
 * that case and the send is skipped, logged, and reported as not sent.
 */
async function sendOrderEmail(
  to: string | null | undefined,
  render: (shop: ShopIdentity) => RenderedEmail,
  event: string,
  orderNumber: string,
): Promise<boolean> {
  if (!to) {
    console.info(logLine({ status: 'SKIPPED', event, orderNumber, reason: 'No email address on this order' }));
    return false;
  }
  const shop = await getShopIdentity();
  return send(render(shop), to);
}

export function sendOrderConfirmationEmail(
  to: string | null | undefined,
  order: OrderEmailData,
): Promise<boolean> {
  return sendOrderEmail(to, (shop) => orderConfirmationEmail(order, shop), 'ORDER_CONFIRMATION', order.orderNumber);
}

export function sendOrderRestructuredEmail(
  to: string | null | undefined,
  order: OrderEmailData,
  previousTotal?: number,
): Promise<boolean> {
  return sendOrderEmail(
    to,
    (shop) => orderRestructuredEmail(order, shop, previousTotal),
    'ORDER_RESTRUCTURED',
    order.orderNumber,
  );
}

export function sendOrderCancelledEmail(
  to: string | null | undefined,
  order: OrderEmailData,
): Promise<boolean> {
  return sendOrderEmail(to, (shop) => orderCancelledEmail(order, shop), 'ORDER_CANCELLED', order.orderNumber);
}
