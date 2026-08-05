import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Cloudinary signed direct upload.
 *
 * The browser posts the file straight to Cloudinary and only sends us the
 * resulting URL, so image bytes never travel through this API — no 5mb body
 * limit, no Railway bandwidth, no base64 bloat in Postgres. All we do is mint
 * a short-lived signature proving the upload was authorized by an admin.
 *
 * Signature rule (Cloudinary): SHA-1 of the upload parameters, sorted by key
 * and joined as `k=v&k=v`, with the API secret appended.
 */

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export function isUploadConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function createUploadSignature(): UploadSignature {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = env.CLOUDINARY_UPLOAD_FOLDER;

  const params: Record<string, string> = { folder, timestamp: String(timestamp) };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const signature = crypto.createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex');

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  };
}
