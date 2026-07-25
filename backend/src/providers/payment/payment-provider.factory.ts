import { PaymentProviderType } from '@prisma/client';
import { PaymentProvider } from './payment-provider.interface';
import { CashOnPickupProvider } from './cash-on-pickup.provider';
import { PhonePeProvider } from './phonepe.provider';

export function getPaymentProvider(type: PaymentProviderType): PaymentProvider {
  switch (type) {
    case PaymentProviderType.PHONEPE:
      return new PhonePeProvider();
    case PaymentProviderType.CASH_ON_PICKUP:
    default:
      return new CashOnPickupProvider();
  }
}
