import { PaymentProviderType, PaymentStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { PaymentInitiationParams, PaymentInitiationResult, PaymentProvider } from './payment-provider.interface';

/**
 * Skeleton only — PhonePe merchant KYC is pending. Every method is a TODO
 * that will be filled in once approved; this provider is only ever
 * constructed when PHONEPE_ENABLED=true, and PaymentService keeps it out
 * of the available-methods list until then, so these throws should be
 * unreachable in practice.
 */
export class PhonePeProvider implements PaymentProvider {
  readonly type = PaymentProviderType.PHONEPE;

  async initiate(_params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    // TODO(post-KYC): build the PhonePe Pay payload (merchantId, merchantTransactionId,
    // amount in paise, redirectUrl, callbackUrl), base64-encode it, sign it with the
    // X-VERIFY checksum header (sha256(payload + "/pg/v1/pay" + PHONEPE_SALT_KEY) + "###" + PHONEPE_SALT_INDEX),
    // and POST to PhonePe's /pg/v1/pay endpoint (sandbox vs prod host per env.PHONEPE_ENV).
    // Return { status: PaymentStatus.PENDING, reference: merchantTransactionId, redirectUrl }.
    throw ApiError.internal('PhonePe is not yet available. Please select Cash on Pickup.');
  }

  async verify(_reference: string): Promise<PaymentStatus> {
    // TODO(post-KYC): call PhonePe's Check Status API
    // (GET /pg/v1/status/{merchantId}/{merchantTransactionId} with the same X-VERIFY scheme)
    // and map its response code to PaymentStatus (PAID/FAILED).
    throw ApiError.internal('PhonePe is not yet available.');
  }

  // TODO(post-KYC): add handleWebhook(payload, xVerifyHeader) to receive PhonePe's
  // asynchronous callback, verify its signature against PHONEPE_SALT_KEY before
  // trusting it, and update the matching order's paymentStatus.
}
