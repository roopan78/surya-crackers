export interface OtpProvider {
  /** Sends `code` to `mobile` via whatever channel this provider implements (SMS, WhatsApp, etc.). */
  sendOtp(mobile: string, code: string): Promise<void>;
}
