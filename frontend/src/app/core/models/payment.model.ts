export type PaymentProviderType = 'PHONEPE' | 'CASH_ON_PICKUP' | 'UPI_DIRECT';
export type PaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentMethodInfo {
  provider: PaymentProviderType;
  label: string;
  available: boolean;
  message?: string;
}

/** GET /orders/:orderNumber/upi-details — dynamic QR + upi:// intent link for UPI_DIRECT orders. */
export interface UpiDetails {
  upiUrl: string;
  qrDataUrl: string;
  vpa: string;
  businessName: string;
  orderNumber: string;
  amount: number;
  paymentStatus: PaymentStatus;
  utrNumber: string | null;
}
