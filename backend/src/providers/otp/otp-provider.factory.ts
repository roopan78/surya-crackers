import { env } from '../../config/env';
import { OtpProvider } from './otp-provider.interface';
import { LocalMockOtpProvider } from './local-mock-otp.provider';

/**
 * Swapping in a real SMS vendor (MSG91, Twilio Verify, etc.) later is a
 * matter of adding a new provider class here and an OTP_PROVIDER value —
 * nothing else in the codebase depends on which provider is active.
 */
export function createOtpProvider(): OtpProvider {
  switch (env.OTP_PROVIDER) {
    case 'mock':
    default:
      return new LocalMockOtpProvider();
  }
}
