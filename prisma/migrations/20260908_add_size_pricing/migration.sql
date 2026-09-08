ALTER TABLE "products" ADD COLUMN "differentPriceBySize" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "product_variants" ADD COLUMN "regularPrice" DOUBLE PRECISION;
ALTER TABLE "product_variants" ADD COLUMN "salePrice" DOUBLE PRECISION;