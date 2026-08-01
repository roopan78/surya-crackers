import { PaymentProviderType, PaymentStatus } from '@prisma/client';
import { PaymentInitiationParams, PaymentInitiationResult, PaymentProvider } from './payment-provider.interface';

/**
 * Dynamic UPI QR + manual UTR verification. The customer pays after order
 * creation from the confirmation page (QR / upi:// intent link served by
 * GET /orders/:orderNumber/upi-details), so initiation just records that
 * payment is outstanding. The status moves to AWAITING_VERIFICATION when the
 * customer submits their 12-digit UTR, and to PAID once staff match that UTR
 * against the bank statement (admin "Mark as Paid" action).
 */
export class UpiDirectProvider implements PaymentProvider {
  readonly type = PaymentProviderType.UPI_DIRECT;

  async initiate(_params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    return { status: PaymentStatus.PENDING };
  }

  async verify(_reference: string): Promise<PaymentStatus> {
    // No PSP API to query — verification is manual against the bank credit.
    return PaymentStatus.PENDING;
  }
}
