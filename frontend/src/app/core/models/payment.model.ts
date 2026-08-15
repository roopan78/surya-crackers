/**
 * PHONEPE and UPI_DIRECT remain in the union because historical orders still
 * carry them. Nothing on the storefront offers a payment method — staff record
 * one from the admin panel when they take the money.
 */
export type PaymentProviderType = 'PHONEPE' | 'CASH_ON_PICKUP' | 'UPI_DIRECT';
export type PaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';

/** What staff can record against a payment they collected. */
export type RecordablePaymentProvider = 'CASH_ON_PICKUP' | 'UPI_DIRECT';
