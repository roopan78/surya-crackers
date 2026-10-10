import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

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

/** False when SMTP credentials are missing — every send is then skipped. */
export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) {
    return null;
  }
  cachedTransporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
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
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(logLine({ status: 'SKIPPED', subject: message.subject, reason: 'SMTP is not configured' }));
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
    console.info(logLine({ status: 'SENT', subject: message.subject, messageId: info.messageId }));
    return true;
  } catch (error) {
    console.error(
      logLine({
        status: 'FAILED',
        subject: message.subject,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

/** Store identity for the mail body — admin-editable via footer config. */
async function getShopName(): Promise<string> {
  try {
    const footer = await prisma.footerConfig.findUnique({ where: { id: 1 } });
    return footer?.shopName || 'Surya Crackers';
  } catch {
    return 'Surya Crackers';
  }
}

/** Minimal escaping — the only interpolated values are a name and a password. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tells a customer the password we generated for them. Sent once, when an
 * account signs in with Google and has no password of its own yet — from then
 * on they can sign in either way, and change the password from their profile.
 */
export async function sendTemporaryPasswordEmail(
  to: string,
  name: string | null,
  temporaryPassword: string,
): Promise<boolean> {
  const shopName = await getShopName();
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hi,';
  const signInUrl = `${env.PUBLIC_SITE_URL.replace(/\/$/, '')}/login`;

  const text = [
    greeting,
    '',
    `Your ${shopName} account is ready. You signed in with Google, so we have also set up a password for you — use it if you ever want to sign in with your email address instead.`,
    '',
    `Email:    ${to}`,
    `Password: ${temporaryPassword}`,
    '',
    'This is a temporary password. You can change it any time from My Profile once you are signed in.',
    '',
    `Sign in: ${signInUrl}`,
    '',
    'If you did not create this account, please ignore this email.',
    '',
    `— ${shopName}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;line-height:1.6">
      <p>${escapeHtml(greeting)}</p>
      <p>
        Your <strong>${escapeHtml(shopName)}</strong> account is ready. You signed in with Google, so we
        have also set up a password for you &mdash; use it if you ever want to sign in with your email
        address instead.
      </p>
      <table style="border-collapse:collapse;margin:20px 0;background:#f8f9fb;border-radius:12px">
        <tr>
          <td style="padding:14px 18px;color:#6b7280">Email</td>
          <td style="padding:14px 18px;font-weight:bold">${escapeHtml(to)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;color:#6b7280">Password</td>
          <td style="padding:14px 18px;font-family:monospace;font-size:17px;font-weight:bold;letter-spacing:1px">
            ${escapeHtml(temporaryPassword)}
          </td>
        </tr>
      </table>
      <p>
        This is a <strong>temporary password</strong>. You can change it any time from
        <em>My Profile</em> once you are signed in.
      </p>
      <p><a href="${escapeHtml(signInUrl)}" style="color:#e63946;font-weight:bold">Sign in to ${escapeHtml(shopName)}</a></p>
      <p style="color:#6b7280;font-size:13px">If you did not create this account, please ignore this email.</p>
      <p style="color:#6b7280;font-size:13px">&mdash; ${escapeHtml(shopName)}</p>
    </div>
  `;

  return sendMail({ to, subject: `Your ${shopName} password`, text, html });
}
