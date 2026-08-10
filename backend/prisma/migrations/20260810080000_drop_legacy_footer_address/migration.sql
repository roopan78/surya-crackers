-- Contract phase. The release reading these columns is no longer running:
-- addresses now live in `shop_addresses`, backfilled by the previous migration.
ALTER TABLE "footer_config" DROP COLUMN IF EXISTS "addresses";
ALTER TABLE "footer_config" DROP COLUMN IF EXISTS "address";
