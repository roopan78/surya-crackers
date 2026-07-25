import { OtpProvider } from './otp-provider.interface';

/**
 * Development/staging OTP "provider" — no real SMS is sent. The code is
 * logged server-side; OtpService additionally echoes it back in the API
 * response (only outside production) so local testing needs no SMS vendor.
 */
export class LocalMockOtpProvider implements OtpProvider {
  async sendOtp(mobile: string, code: string): Promise<void> {
    console.log(`[LocalMockOtpProvider] OTP for ${mobile}: ${code}`);
  }
}
