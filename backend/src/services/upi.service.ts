import QRCode from 'qrcode';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface UpiPaymentDetails {
  upiUrl: string;
  qrDataUrl: string;
  vpa: string;
  businessName: string;
}

export function isUpiConfigured(): boolean {
  return env.BUSINESS_VPA !== '';
}

/**
 * Builds an NPCI UPI deep link (upi://pay?...) for the given order.
 * encodeURIComponent (not URLSearchParams) on purpose: URLSearchParams encodes
 * spaces as "+", which several UPI apps display literally in the payee name/note.
 */
export function buildUpiPaymentUrl(orderNumber: string, amount: number): string {
  const params: [string, string][] = [
    ['pa', env.BUSINESS_VPA],
    ['pn', env.BUSINESS_NAME],
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', `Order ${orderNumber}`],
    ['tr', orderNumber],
  ];
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `upi://pay?${query}`;
}

/** Single source of UPI URL + QR generation — do not duplicate this elsewhere. */
export async function generateUpiPaymentDetails(orderNumber: string, amount: number): Promise<UpiPaymentDetails> {
  if (!isUpiConfigured()) {
    throw ApiError.internal('UPI payment is not configured (BUSINESS_VPA is missing)');
  }

  const upiUrl = buildUpiPaymentUrl(orderNumber, amount);
  const qrDataUrl = await QRCode.toDataURL(upiUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });

  return { upiUrl, qrDataUrl, vpa: env.BUSINESS_VPA, businessName: env.BUSINESS_NAME };
}
