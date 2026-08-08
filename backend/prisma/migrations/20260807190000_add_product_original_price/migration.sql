-- Pre-discount / MRP price. Nullable: existing products are simply not discounted.
ALTER TABLE "products" ADD COLUMN "originalPrice" DECIMAL(10,2);
