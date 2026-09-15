-- Amira Store: PostgreSQL schema parity and integrity constraints.
-- Safe for both the existing production-shaped schema and a fresh database
-- created by the 20260910135452_init baseline migration.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "differentPriceBySize" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "product_variants"
  ADD COLUMN IF NOT EXISTS "regularPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "salePrice" DOUBLE PRECISION;

ALTER TABLE "store_settings"
  DROP COLUMN IF EXISTS "freeShippingEnabled",
  DROP COLUMN IF EXISTS "freeShippingMinOrder",
  DROP COLUMN IF EXISTS "freeShippingStart",
  DROP COLUMN IF EXISTS "freeShippingEnd";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stock_non_negative" CHECK ("stock" >= 0);

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "products"
  ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0),
  ADD CONSTRAINT "products_comparePrice_non_negative" CHECK ("comparePrice" IS NULL OR "comparePrice" >= 0),
  ADD CONSTRAINT "products_costPrice_non_negative" CHECK ("costPrice" IS NULL OR "costPrice" >= 0);

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_regularPrice_non_negative" CHECK ("regularPrice" IS NULL OR "regularPrice" >= 0),
  ADD CONSTRAINT "product_variants_salePrice_non_negative" CHECK ("salePrice" IS NULL OR "salePrice" >= 0);

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_value_non_negative" CHECK ("value" >= 0),
  ADD CONSTRAINT "coupons_minOrder_non_negative" CHECK ("minOrder" IS NULL OR "minOrder" >= 0),
  ADD CONSTRAINT "coupons_usedCount_non_negative" CHECK ("usedCount" >= 0),
  ADD CONSTRAINT "coupons_usageLimit_non_negative" CHECK ("usageLimit" IS NULL OR "usageLimit" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_non_negative" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orders_shippingCost_non_negative" CHECK ("shippingCost" IS NULL OR "shippingCost" >= 0),
  ADD CONSTRAINT "orders_discount_non_negative" CHECK ("discount" >= 0),
  ADD CONSTRAINT "orders_total_non_negative" CHECK ("total" >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_productPrice_non_negative" CHECK ("productPrice" >= 0);
