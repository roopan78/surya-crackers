-- Move shop locations into their own table so each can carry an isPrimary flag
-- (the LocalBusiness structured data publishes exactly one address).
CREATE TABLE "shop_addresses" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_addresses_sortOrder_idx" ON "shop_addresses"("sortOrder");

-- Carry existing addresses across, preserving their order. The first becomes
-- primary by default; an admin can move the flag in the footer settings.
INSERT INTO "shop_addresses" ("id", "address", "isPrimary", "sortOrder", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    entry.value,
    entry.ordinality = 1,
    (entry.ordinality - 1)::int,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "footer_config" fc,
     LATERAL unnest(fc."addresses") WITH ORDINALITY AS entry(value, ordinality)
WHERE fc."id" = 1 AND btrim(entry.value) <> '';

-- The legacy `address` / `addresses` columns are dropped in a follow-up
-- migration, once the release that stopped reading them is live. Prisma only
-- selects the columns in its schema, so leaving them here breaks nothing.
