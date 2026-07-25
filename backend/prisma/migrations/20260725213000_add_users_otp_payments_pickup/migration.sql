-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CUSTOMER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "PaymentProviderType" AS ENUM ('PHONEPE', 'CASH_ON_PICKUP');
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN');

-- Rename OrderStatus values away from WhatsApp/delivery language (existing rows keep their row, just the label changes)
ALTER TYPE "OrderStatus" RENAME VALUE 'PENDING_WHATSAPP' TO 'PENDING';
ALTER TYPE "OrderStatus" RENAME VALUE 'DISPATCHED' TO 'READY_FOR_PICKUP';
ALTER TYPE "OrderStatus" RENAME VALUE 'DELIVERED' TO 'COMPLETED';

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otps_mobile_purpose_idx" ON "otps"("mobile", "purpose");

ALTER TABLE "otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add new nullable order columns first
ALTER TABLE "order_ledger" ADD COLUMN "customerId" TEXT;
ALTER TABLE "order_ledger" ADD COLUMN "guestName" TEXT;
ALTER TABLE "order_ledger" ADD COLUMN "guestMobile" TEXT;
ALTER TABLE "order_ledger" ADD COLUMN "pickupDate" TIMESTAMP(3);
ALTER TABLE "order_ledger" ADD COLUMN "pickupTime" TEXT;
ALTER TABLE "order_ledger" ADD COLUMN "notes" TEXT;
ALTER TABLE "order_ledger" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "order_ledger" ADD COLUMN "paymentProvider" "PaymentProviderType";
ALTER TABLE "order_ledger" ADD COLUMN "paymentReference" TEXT;

-- Backfill existing rows: these were already fulfilled through the old WhatsApp
-- process, so recording them as settled Cash on Pickup transactions is the
-- accurate historical record (there is no card/UPI payment reference for them).
UPDATE "order_ledger"
SET "guestName" = "customerName",
    "guestMobile" = "phone",
    "paymentProvider" = 'CASH_ON_PICKUP',
    "paymentStatus" = 'PAID'
WHERE "guestName" IS NULL;

-- Now that every existing row has been backfilled, require paymentProvider going forward
ALTER TABLE "order_ledger" ALTER COLUMN "paymentProvider" SET NOT NULL;

-- Drop delivery-era columns (no more home delivery, no more single flat customerName/phone)
ALTER TABLE "order_ledger" DROP COLUMN "customerName";
ALTER TABLE "order_ledger" DROP COLUMN "deliveryAddress";
ALTER TABLE "order_ledger" DROP COLUMN "phone";
ALTER TABLE "order_ledger" DROP COLUMN "preferredDate";

ALTER TABLE "order_ledger" ADD CONSTRAINT "order_ledger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "order_ledger_paymentStatus_idx" ON "order_ledger"("paymentStatus");
CREATE INDEX "order_ledger_customerId_idx" ON "order_ledger"("customerId");

-- Retire the old username/password Admin model — admin login is now the same
-- mobile+OTP mechanism as everyone else (see users/otps above).
DROP TABLE "admins";
