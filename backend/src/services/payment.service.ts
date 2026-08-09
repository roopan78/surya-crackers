import { PaymentProviderType } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { getPaymentProvider } from '../providers/payment/payment-provider.factory';
import { PaymentInitiationParams, PaymentInitiationResult } from '../providers/payment/payment-provider.interface';

export interface PaymentMethodInfo {
  provider: PaymentProviderType;
  label: string;
  available: boolean;
  message?: string;
}

const ONLINE_PAYMENT_WITHDRAWN_MESSAGE =
  'Online payment is not available. Orders are confirmed by our team and settled at pickup.';

/**
 * Online payment (UPI QR and PhonePe) was withdrawn: following the 2018 Supreme
 * Court restrictions on firecracker sales, orders are taken as enquiries, put on
 * hold and confirmed by staff, with payment collected in person at pickup.
 *
 * The UPI_DIRECT / PHONEPE enum values are deliberately kept — historical orders
 * still reference them — they are simply no longer offered or accepted.
 */
export function getAvailableMethods(): PaymentMethodInfo[] {
  return [{ provider: PaymentProviderType.CASH_ON_PICKUP, label: 'Cash on Pickup', available: true }];
}

export async function initiatePayment(
  providerType: PaymentProviderType,
  params: PaymentInitiationParams,
): Promise<PaymentInitiationResult> {
  if (providerType !== PaymentProviderType.CASH_ON_PICKUP) {
    throw ApiError.badRequest(ONLINE_PAYMENT_WITHDRAWN_MESSAGE);
  }

  const provider = getPaymentProvider(providerType);
  return provider.initiate(params);
}
