import crypto from 'crypto';

/** Generates a human-readable, sufficiently unique public order identifier, e.g. SC-20260719-4F2A9C. */
export function generateOrderNumber(date: Date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SC-${datePart}-${randomPart}`;
}
