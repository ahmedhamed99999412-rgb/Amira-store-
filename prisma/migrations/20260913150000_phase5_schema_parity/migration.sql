-- AMIRA STORE - live Neon schema parity migration
-- Verified against the production Neon database on 2026-09-13.
-- Non-destructive additions first; legacy Free Shipping columns are removed
-- because that feature has been permanently removed from the application.

ALTER TABLE "products"
  ADD COLUMN "differentPriceBySize" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "product_variants"
  ADD COLUMN "regularPrice" DOUBLE PRECISION,
  ADD COLUMN "salePrice" DOUBLE PRECISION;

ALTER TABLE "store_settings"
  DROP COLUMN "freeShippingEnabled",
  DROP COLUMN "freeShippingMinOrder",
  DROP COLUMN "freeShippingStart",
  DROP COLUMN "freeShippingEnd";

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
