import { PaymentProviderType } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { getPaymentProvider } from '../providers/payment/payment-provider.factory';
import { PaymentInitiationParams, PaymentInitiationResult } from '../providers/payment/payment-provider.interface';

export interface PaymentMethodInfo {
  provider: PaymentProviderType;
  label: string;
  available: boolean;
  message?: string;
}

const PHONEPE_UNAVAILABLE_MESSAGE =
  'Online payment will be available shortly. We are currently completing our payment gateway verification.';

export function getAvailableMethods(): PaymentMethodInfo[] {
  return [
    { provider: PaymentProviderType.CASH_ON_PICKUP, label: 'Cash on Pickup', available: true },
    {
      provider: PaymentProviderType.PHONEPE,
      label: 'PhonePe',
      available: env.PHONEPE_ENABLED,
      ...(env.PHONEPE_ENABLED ? {} : { message: PHONEPE_UNAVAILABLE_MESSAGE }),
    },
  ];
}

export async function initiatePayment(
  providerType: PaymentProviderType,
  params: PaymentInitiationParams,
): Promise<PaymentInitiationResult> {
  if (providerType === PaymentProviderType.PHONEPE && !env.PHONEPE_ENABLED) {
    throw ApiError.badRequest('PhonePe is not available yet. Please select Cash on Pickup.');
  }

  const provider = getPaymentProvider(providerType);
  return provider.initiate(params);
}
