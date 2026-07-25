import { PaymentProviderType, PaymentStatus } from '@prisma/client';
import { PaymentInitiationParams, PaymentInitiationResult, PaymentProvider } from './payment-provider.interface';

/**
 * No external call at all — the order is simply marked as awaiting payment
 * until staff collect cash at pickup and confirm it themselves via the
 * admin "Mark as Paid" action (order.controller.ts confirmPaymentManually).
 */
export class CashOnPickupProvider implements PaymentProvider {
  readonly type = PaymentProviderType.CASH_ON_PICKUP;

  async initiate(_params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    return { status: PaymentStatus.PENDING };
  }

  async verify(_reference: string): Promise<PaymentStatus> {
    return PaymentStatus.PENDING;
  }
}
