import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // RBAC / super-admin bootstrap — this email is always granted SUPER_ADMIN
  SUPER_ADMIN_EMAIL: z.string().default(''),

  // Google Sign-In — OAuth 2.0 Web client ID from Google Cloud Console
  GOOGLE_CLIENT_ID: z.string().default(''),

  // Direct UPI payments — QR/intent links point at this VPA. Leaving BUSINESS_VPA
  // empty keeps the UPI_DIRECT method hidden from checkout (safe default until
  // the real merchant VPA is configured).
  BUSINESS_VPA: z.string().default(''),
  BUSINESS_NAME: z.string().default(''),

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
