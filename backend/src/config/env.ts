import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Canonical public storefront origin — used for absolute URLs in the sitemap
  PUBLIC_SITE_URL: z.string().default('https://suryacrackers.shop'),

  // IndexNow key. Must match the filename served at <site>/<key>.txt, which is
  // how the search engine verifies we own the host. Empty disables submission.
  INDEXNOW_KEY: z.string().default(''),

  // RBAC / super-admin bootstrap — this email is always granted SUPER_ADMIN
  SUPER_ADMIN_EMAIL: z.string().default(''),

  // Google Sign-In — OAuth 2.0 Web client ID from Google Cloud Console
  GOOGLE_CLIENT_ID: z.string().default(''),

  // WhatsApp Business Cloud API (Meta). Leaving ACCESS_TOKEN or PHONE_NUMBER_ID
  // empty disables notification sending entirely — every send is then logged as
  // SKIPPED instead of failing, so a missing config never breaks checkout.
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
  // Shared secret echoed back during Meta's webhook subscription handshake.
  WHATSAPP_VERIFY_TOKEN: z.string().default(''),
  // Meta App Secret — used to verify the X-Hub-Signature-256 header on incoming
  // webhooks. Leave empty only during initial setup: signature checking is
  // enforced strictly as soon as a value is present.
  WHATSAPP_APP_SECRET: z.string().default(''),
  // Names of the Meta-approved message templates (not the message bodies).
  WHATSAPP_TEMPLATE_ORDER_SUCCESS: z.string().default('order_confirmation'),
  WHATSAPP_TEMPLATE_ORDER_FAILED: z.string().default('order_failed'),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en'),

  // Cloudinary — product image hosting. The browser uploads directly to
  // Cloudinary using a short-lived signature minted here, so image bytes never
  // pass through this API and are not limited by its request body size.
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('surya-crackers'),

  // Where the staff Android APK is kept. Points at a Railway volume in
  // production — the container filesystem is wiped on every deploy, so a plain
  // directory inside the image would lose the build the first time the API
  // restarted. Locally it falls back to a gitignored folder in the repo.
  APP_RELEASE_DIR: z.string().default(''),

  // PhonePe — merchant KYC pending, keep disabled in production until approved
  PHONEPE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  PHONEPE_ENV: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  PHONEPE_MERCHANT_ID: z.string().default(''),
  PHONEPE_SALT_KEY: z.string().default(''),
  PHONEPE_SALT_INDEX: z.string().default('1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Check your .env file against .env.example.');
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
};
