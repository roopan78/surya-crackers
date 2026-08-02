const DEFAULT_COUNTRY_CODE = '91'; // India — the only market this store serves

/**
 * Normalizes a stored mobile number to E.164 digits (no '+'), which is the
 * format Meta's Cloud API expects in the `to` field. Returns null when the
 * value cannot be trusted, so callers can skip rather than send into the void.
 *
 * Accepts: "9876543210", "+91 98765 43210", "091-9876543210", "919876543210".
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  let digits = String(raw).replace(/[^\d+]/g, '');
  digits = digits.startsWith('+') ? digits.slice(1) : digits;
  digits = digits.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  // Local trunk prefix: 0XXXXXXXXXX -> XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Bare local number gets the default country code.
  if (digits.length === 10) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  }
  // 00-prefixed international dialling: 0091XXXXXXXXXX
  if (digits.length > 12 && digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // E.164 allows 8-15 digits including the country code.
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  // An Indian mobile is 91 + [6-9]XXXXXXXXX; reject landlines/typos early.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 12 && !/^[6-9]/.test(digits.slice(2))) {
    return null;
  }

  return digits;
}

/** Display form for logs and admin screens. */
export function toDisplayPhone(e164Digits: string): string {
  return `+${e164Digits}`;
}
