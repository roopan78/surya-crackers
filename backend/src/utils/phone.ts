/**
 * Normalizes a mobile number to a canonical 12-digit form with the Indian
 * country code (e.g. "+91 98765-43210", "9876543210", and "919876543210"
 * all normalize to "919876543210") so lookups/comparisons never miss due
 * to formatting or country-code-presence differences. Used everywhere a
 * mobile number is stored, compared, or matched against SUPER_ADMIN_MOBILE.
 * India-only assumption is intentional — this business operates in India.
 */
export function normalizeMobile(input: string): string {
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}
