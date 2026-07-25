import { PaymentProviderType, PaymentStatus } from '@prisma/client';

export interface PaymentInitiationParams {
  orderId: string;
  orderNumber: string;
  amount: number;
}

export interface PaymentInitiationResult {
  status: PaymentStatus;
  reference?: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  initiate(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
  verify(reference: string): Promise<PaymentStatus>;
}
