export type PaymentProviderType = 'PHONEPE' | 'CASH_ON_PICKUP';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentMethodInfo {
  provider: PaymentProviderType;
  label: string;
  available: boolean;
  message?: string;
}
