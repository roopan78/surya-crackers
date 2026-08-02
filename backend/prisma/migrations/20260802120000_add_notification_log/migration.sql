-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "event" TEXT NOT NULL,
    "channel" "NotificationChannelType" NOT NULL DEFAULT 'WHATSAPP',
    "templateName" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_log_status_idx" ON "notification_log"("status");

-- CreateIndex
CREATE INDEX "notification_log_orderNumber_idx" ON "notification_log"("orderNumber");

-- CreateIndex
CREATE INDEX "notification_log_providerMessageId_idx" ON "notification_log"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_orderId_event_channel_key" ON "notification_log"("orderId", "event", "channel");

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
