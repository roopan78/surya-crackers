-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_VERIFICATION' AFTER 'PENDING';

-- AlterEnum
ALTER TYPE "PaymentProviderType" ADD VALUE 'UPI_DIRECT';

-- AlterTable
ALTER TABLE "order_ledger" ADD COLUMN "utrNumber" TEXT;
