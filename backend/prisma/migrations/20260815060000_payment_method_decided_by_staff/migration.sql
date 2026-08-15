-- Orders are placed on hold with no payment method chosen: the customer no
-- longer selects one, and staff record it when they confirm the order and take
-- payment. Existing rows keep whatever provider they were created with.
ALTER TABLE "order_ledger" ALTER COLUMN "paymentProvider" DROP NOT NULL;
