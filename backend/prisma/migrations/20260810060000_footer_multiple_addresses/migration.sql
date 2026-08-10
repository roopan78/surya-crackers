-- Replace the single free-text address with one entry per branch.
ALTER TABLE "footer_config" ADD COLUMN "addresses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Carry the existing address across so nothing disappears from the storefront;
-- an admin can then split a combined value into separate entries.
UPDATE "footer_config"
SET "addresses" = ARRAY["address"]
WHERE "address" IS NOT NULL AND btrim("address") <> '';

-- Expand/contract: the old column stays for now (nullable, no longer written)
-- so the release running during this migration keeps serving. A later migration
-- can drop it once this one is live.
ALTER TABLE "footer_config" ALTER COLUMN "address" DROP NOT NULL;
