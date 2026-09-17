import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { resolveDisplayComparePrice } from '@/lib/product-variants';

// Reusable SQL: the lowest effective variant price (sale if available, else
// regular, with priceAdjustment applied), falling back to the product's base
// price when the product has no priced variants. Used by price-range filters
// so that filtering reflects what the card actually displays.
const lowestVariantDisplayPrice = Prisma.sql`COALESCE((
  SELECT MIN(COALESCE(pv."salePrice", pv."regularPrice") + COALESCE(pv."priceAdjustment", 0))
  FROM "product_variants" pv
  WHERE pv."productId" = p."id"
  AND (pv."salePrice" IS NOT NULL OR pv."regularPrice" IS NOT NULL)
), p."price")`;

// ============================================================
// STORE SETTINGS
// ============================================================

// Get store settings (singleton record)
const getStoreSettingsCached = unstable_cache(
  async () => {
    const settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      throw new Error('Store settings not found. Run db:seed.');
    }

    return {
      ...settings,
      announcementAr: settings.announcementAr,
      announcementEn: settings.announcementEn,
    };
  },
  ['amira-store-settings-v1'],
  { revalidate: 60 }
);

export async function getStoreSettings() {
  return getStoreSettingsCached();
}

// ============================================================
// CATEGORIES (for navigation and homepage)
// ============================================================

// Get all main categories (parentId = null) with their translations and children
// Used for: Header navigation, Category circles on homepage
const getMainCategoriesCached = unstable_cache(
  async (locale: string) => {
    const locales = locale === 'ar' ? ['ar'] : [locale, 'ar'];
    const categories = await db.category.findMany({
      where: { parentId: null, isActive: true },
      select: {
        id: true,
        slug: true,
        order: true,
        image: { select: { id: true } },
        translations: { where: { locale: { in: locales } }, select: { locale: true, name: true } },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            slug: true,
            order: true,
            translations: { where: { locale: { in: locales } }, select: { locale: true, name: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name:
        cat.translations.find((t) => t.locale === locale)?.name ||
        cat.translations.find((t) => t.locale === 'ar')?.name ||
        cat.slug,
      image: cat.image,
      children: cat.children.map((child) => ({
        id: child.id,
        slug: child.slug,
        name:
          child.translations.find((t) => t.locale === locale)?.name ||
          child.translations.find((t) => t.locale === 'ar')?.name ||
          child.slug,
      })),
    }));
  },
  ['amira-main-categories-v2'],
  { revalidate: 60 }
);

export async function getMainCategories(locale: string) {
  return getMainCategoriesCached(locale);
}


// ============================================================
// BANNERS (hero and promo)
// ============================================================

// Get active hero banners (ordered)
const getHeroBannersCached = unstable_cache(
  async () => db.banner.findMany({
    where: { type: 'HERO', isActive: true },
    select: {
      id: true, titleAr: true, titleEn: true, subtitleAr: true, subtitleEn: true,
      ctaTextAr: true, ctaTextEn: true, ctaLink: true, order: true,
    },
    orderBy: { order: 'asc' },
  }),
  ['amira-hero-banners-v1'],
  { revalidate: 60 }
);

export async function getHeroBanners() {
  return getHeroBannersCached();
}

// Get active promo banners (ordered)
const getPromoBannersCached = unstable_cache(
  async () => db.banner.findMany({
    where: { type: 'PROMO', isActive: true },
    select: {
      id: true, titleAr: true, titleEn: true, subtitleAr: true, subtitleEn: true,
      ctaTextAr: true, ctaTextEn: true, ctaLink: true, order: true,
    },
    orderBy: { order: 'asc' },
  }),
  ['amira-promo-banners-v1'],
  { revalidate: 60 }
);

export async function getPromoBanners() {
  return getPromoBannersCached();
}

// ============================================================
// PRODUCTS (for homepage trending section)
// ============================================================

// Get featured products for "Trending Now" section.
// Keep this as one SQL round-trip: the storefront only needs card data, not full Prisma relations.
const getFeaturedProductsCached = unstable_cache(async (locale: string, limit: number = 12) => {
  const rows = await db.$queryRaw<Array<{
    id: string;
    slug: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    displayPrice: number;
    displayComparePrice: number | null;
    hasVariants: boolean;
    hasSizeVariants: boolean;
    hasColorVariants: boolean;
    minVariantRegularPrice: number | null;
    minVariantSalePrice: number | null;
    variantCount: number;
    name: string;
    shortDescription: string | null;
    category: string | null;
    imageId: string | null;
    totalStock: number;
    reviewCount: number;
    avgRating: number | null;
  }>>(Prisma.sql`
    SELECT
      p."id",
      p."slug",
      p."sku",
      CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)), p."price") FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) ELSE p."price" END AS "price",
      p."comparePrice",
      (SELECT MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) AS "minVariantRegularPrice",
      (SELECT MIN(pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."salePrice" IS NOT NULL AND (pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) < COALESCE(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0), p."comparePrice", p."price")) AS "minVariantSalePrice",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."size" IS NOT NULL) AS "hasSizeVariants",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."color" IS NOT NULL) AS "hasColorVariants",
      p."hasVariants",
      (SELECT COUNT(*)::int FROM "product_variants" pv WHERE pv."productId" = p."id") AS "variantCount",
      COALESCE(
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        p."slug"
      ) AS "name",
      COALESCE(
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        ''
      ) AS "shortDescription",
      (SELECT ct."name" FROM "category_translations" ct WHERE ct."categoryId" = p."categoryId" AND ct."locale" = ${locale} LIMIT 1) AS "category",
      (SELECT pi."id" FROM "product_images" pi WHERE pi."productId" = p."id" ORDER BY pi."order" ASC LIMIT 1) AS "imageId",
      COALESCE((SELECT SUM(pv."stock") FROM "product_variants" pv WHERE pv."productId" = p."id"), 0)::int AS "totalStock",
      COALESCE((SELECT COUNT(*)::int FROM "reviews" r WHERE r."productId" = p."id" AND r."isApproved" = true), 0)::int AS "reviewCount",
      (SELECT AVG(r."rating")::float8 FROM "reviews" r WHERE r."productId" = p."id" AND r."isApproved" = true) AS "avgRating"
    FROM "products" p
    WHERE p."isActive" = true AND p."isDeleted" = false AND p."isFeatured" = true
    ORDER BY p."createdAt" DESC
    LIMIT ${limit}
  `);
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    comparePrice: p.comparePrice,
    displayPrice: p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
    displayComparePrice: resolveDisplayComparePrice(
      p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
      p.comparePrice,
      p.minVariantSalePrice,
      p.minVariantRegularPrice
    ),
    name: p.name,
    shortDescription: p.shortDescription || '',
    category: p.category || '',
    image: p.imageId ? `/api/images/${p.imageId}` : null,
    totalStock: p.totalStock,
    hasVariants: p.hasVariants,
    hasSizeVariants: p.hasSizeVariants,
    hasColorVariants: p.hasColorVariants,
    reviewCount: p.reviewCount,
    avgRating: p.avgRating ?? 0,
  }));
}, ['amira-featured-products-v3'], { revalidate: 1, tags: ['amira-products'] });

export async function getFeaturedProducts(locale: string, limit: number = 12) {
  return getFeaturedProductsCached(locale, limit);
}

// ============================================================
// CATEGORY (for category page)
// ============================================================

// Get a category by slug with full tree info (parent chain, children, products)
const getCategoryBySlugCached = unstable_cache(async (slug: string, locale: string) => {
  const category = await db.category.findUnique({
    where: { slug },
    include: {
      translations: { where: { locale: { in: locale === 'ar' ? ['ar'] : [locale, 'ar'] } }, select: { locale: true, name: true, description: true } },
      image: { select: { id: true } },
      parent: {
        include: {
          translations: { where: { locale: { in: locale === 'ar' ? ['ar'] : [locale, 'ar'] } }, select: { locale: true, name: true } },
          parent: { include: { translations: { select: { locale: true, name: true } }, parent: { include: { translations: { select: { locale: true, name: true } } } } } },
        },
      },
      children: {
        where: { isActive: true },
        include: {
          translations: { select: { locale: true, name: true } },
          image: { select: { id: true } },
          children: {
            where: { isActive: true },
            select: { id: true },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!category || !category.isActive) return null;

  // Build breadcrumb (parent chain from root to current)
  const breadcrumb: { slug: string; name: string }[] = [];
  let current: any = category;
  while (current) {
    const name =
      current.translations.find((t: any) => t.locale === locale)?.name ||
      current.translations.find((t: any) => t.locale === 'ar')?.name ||
      current.slug;
    breadcrumb.unshift({ slug: current.slug, name });
    current = current.parent;
  }

  const name =
    category.translations.find((t) => t.locale === locale)?.name ||
    category.translations.find((t) => t.locale === 'ar')?.name ||
    category.slug;

  const description =
    category.translations.find((t) => t.locale === locale)?.description ||
    category.translations.find((t) => t.locale === 'ar')?.description ||
    '';

  // Map children (subcategories)
  const children = category.children.map((child) => ({
    id: child.id,
    slug: child.slug,
    name:
      child.translations.find((t) => t.locale === locale)?.name ||
      child.translations.find((t) => t.locale === 'ar')?.name ||
      child.slug,
    image: child.image,
    childrenCount: child.children.length,
  }));

  return {
    id: category.id,
    slug: category.slug,
    name,
    description,
    image: category.image,
    breadcrumb,
    children,
    hasChildren: category.children.length > 0,
  };
  }, ['amira-category-by-slug-v1'], { revalidate: 1 });

export async function getCategoryBySlug(slug: string, locale: string) {
  return getCategoryBySlugCached(slug, locale);
}

// ============================================================
// PRODUCTS BY CATEGORY (for category page)
// ============================================================

// Get products by category (including all descendant categories) with filtering & pagination
const getProductsByCategoryCached = unstable_cache(
  async function getProductsByCategory(
    categorySlug: string,
    locale: string,
    options: {
      page?: number;
      pageSize?: number;
      minPrice?: number;
      maxPrice?: number;
      sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating';
      onSale?: boolean;
    } = {}
  ) {
    const { page = 1, pageSize = 12, minPrice, maxPrice, sort = 'newest', onSale } = options;
    const safePage = Number.isSafeInteger(page) && page >= 1 ? Math.min(page, 10_000) : 1;
    const safePageSize = Number.isSafeInteger(pageSize) && pageSize >= 1 ? Math.min(pageSize, 100) : 12;
    const offset = (safePage - 1) * safePageSize;
    const locales = locale === 'ar' ? ['ar'] : [locale, 'ar'];

    const orderSql =
      sort === 'price-asc'
        ? Prisma.sql`CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END ASC, p."createdAt" DESC`
        : sort === 'price-desc'
        ? Prisma.sql`CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END DESC, p."createdAt" DESC`
        : sort === 'rating'
        ? Prisma.sql`COALESCE(rs."avgRating", 0) DESC, COALESCE(rs."reviewCount", 0) DESC, p."createdAt" DESC`
        : Prisma.sql`p."createdAt" DESC`;

    const rows = await db.$queryRaw<Array<{
      id: string;
      slug: string;
      sku: string;
      price: number;
      comparePrice: number | null;
      hasVariants: boolean;
      hasSizeVariants: boolean;
      hasColorVariants: boolean;
      minVariantRegularPrice: number | null;
      minVariantSalePrice: number | null;
      variantCount: number;
      name: string;
      shortDescription: string | null;
      category: string | null;
      imageId: string | null;
      totalStock: number;
      reviewCount: number;
      avgRating: number | null;
      totalCount: number;
    }>>(Prisma.sql`
      WITH RECURSIVE category_tree AS (
        SELECT c."id"
        FROM "categories" c
        WHERE c."slug" = ${categorySlug}

        UNION ALL

        SELECT c."id"
        FROM "categories" c
        INNER JOIN category_tree ct ON c."parentId" = ct."id"
        WHERE c."isActive" = true
      ),
      variant_stats AS (
        SELECT pv."productId", COALESCE(SUM(pv."stock"), 0)::int AS "totalStock"
        FROM "product_variants" pv
        GROUP BY pv."productId"
      ),
      review_stats AS (
        SELECT
          r."productId",
          COUNT(*) FILTER (WHERE r."isApproved" = true)::int AS "reviewCount",
          AVG(r."rating") FILTER (WHERE r."isApproved" = true)::float8 AS "avgRating"
        FROM "reviews" r
        GROUP BY r."productId"
      )
      SELECT
        p."id",
        p."slug",
        p."sku",
        CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END AS "price",
        p."comparePrice",
        (SELECT MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) AS "minVariantRegularPrice",
      (SELECT MIN(pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."salePrice" IS NOT NULL AND (pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) < COALESCE(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0), p."comparePrice", p."price")) AS "minVariantSalePrice",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."size" IS NOT NULL) AS "hasSizeVariants",
        EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."color" IS NOT NULL) AS "hasColorVariants",
        p."hasVariants",
        (SELECT COUNT(*)::int FROM "product_variants" pv0 WHERE pv0."productId" = p."id") AS "variantCount",
        COALESCE(
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        p."slug"
      ) AS "name",
      COALESCE(
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        ''
      ) AS "shortDescription",
      (SELECT ct."name"
       FROM "category_translations" ct
       WHERE ct."categoryId" = p."categoryId" AND ct."locale" IN (${Prisma.join(locales)})
       ORDER BY CASE WHEN ct."locale" = ${locale} THEN 0 ELSE 1 END
       LIMIT 1) AS "category",
      (SELECT pi."id" FROM "product_images" pi WHERE pi."productId" = p."id" ORDER BY pi."order" ASC LIMIT 1) AS "imageId",
      COALESCE(vs."totalStock", 0)::int AS "totalStock",
      COALESCE(rs."reviewCount", 0)::int AS "reviewCount",
      rs."avgRating",
      COUNT(*) OVER()::int AS "totalCount"
      FROM "products" p
      LEFT JOIN variant_stats vs ON vs."productId" = p."id"
      LEFT JOIN review_stats rs ON rs."productId" = p."id"
      WHERE p."isActive" = true
        AND p."isDeleted" = false
        AND p."categoryId" IN (SELECT "id" FROM category_tree)
        ${minPrice !== undefined ? Prisma.sql`AND ${lowestVariantDisplayPrice} >= ${minPrice}` : Prisma.empty}
        ${maxPrice !== undefined ? Prisma.sql`AND ${lowestVariantDisplayPrice} <= ${maxPrice}` : Prisma.empty}
        ${onSale ? Prisma.sql`AND (p."comparePrice" IS NOT NULL AND p."comparePrice" > p."price" OR EXISTS (SELECT 1 FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."salePrice" IS NOT NULL AND (pv2."salePrice" + COALESCE(pv2."priceAdjustment", 0)) < COALESCE(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0), p."comparePrice", p."price")))` : Prisma.empty}
      ORDER BY ${orderSql}
      OFFSET ${offset}
      LIMIT ${safePageSize}
    `);

    const total = rows[0]?.totalCount ?? 0;
    return {
      products: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice,
        displayPrice: p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
        displayComparePrice: resolveDisplayComparePrice(
      p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
      p.comparePrice,
      p.minVariantSalePrice,
      p.minVariantRegularPrice
    ),
        name: p.name,
        shortDescription: p.shortDescription || '',
        category: p.category || '',
        image: p.imageId ? `/api/images/${p.imageId}` : null,
        totalStock: p.totalStock,
        hasVariants: p.hasVariants,
        hasSizeVariants: p.hasSizeVariants,
        hasColorVariants: p.hasColorVariants,
        minVariantRegularPrice: p.minVariantRegularPrice,
        minVariantSalePrice: p.minVariantSalePrice,
        reviewCount: p.reviewCount,
        avgRating: p.avgRating ?? 0,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  },
  ['amira-products-by-category-v3'],
  { revalidate: 1, tags: ['amira-products'] }
);

export async function getProductsByCategory(
  categorySlug: string,
  locale: string,
  options: {
    page?: number;
    pageSize?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating';
    onSale?: boolean;
  } = {}
) {
  return getProductsByCategoryCached(categorySlug, locale, options);
}

// ============================================================
// ALL PRODUCTS (for shop page with search/filter)
// ============================================================

const getAllProductsCached = unstable_cache(
  async function getAllProducts(
    locale: string,
    options: {
      page?: number;
      pageSize?: number;
      q?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating';
      onSale?: boolean;
      featured?: boolean;
    } = {}
  ) {
    const { page = 1, pageSize = 12, q, categoryId, minPrice, maxPrice, sort = 'newest', onSale, featured } = options;
    const safePage = Number.isSafeInteger(page) && page >= 1 ? Math.min(page, 10_000) : 1;
    const safePageSize = Number.isSafeInteger(pageSize) && pageSize >= 1 ? Math.min(pageSize, 100) : 12;
    const offset = (safePage - 1) * safePageSize;
    const locales = locale === 'ar' ? ['ar'] : [locale, 'ar'];

    const orderSql =
      sort === 'price-asc'
        ? Prisma.sql`CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END ASC, p."createdAt" DESC`
        : sort === 'price-desc'
        ? Prisma.sql`CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END DESC, p."createdAt" DESC`
        : sort === 'rating'
        ? Prisma.sql`COALESCE(rs."avgRating", 0) DESC, COALESCE(rs."reviewCount", 0) DESC, p."createdAt" DESC`
        : Prisma.sql`p."createdAt" DESC`;

    const rows = await db.$queryRaw<Array<{
      id: string;
      slug: string;
      sku: string;
      price: number;
      comparePrice: number | null;
      hasVariants: boolean;
      hasSizeVariants: boolean;
      hasColorVariants: boolean;
      minVariantRegularPrice: number | null;
      minVariantSalePrice: number | null;
      variantCount: number;
      name: string;
      shortDescription: string | null;
      category: string | null;
      imageId: string | null;
      totalStock: number;
      reviewCount: number;
      avgRating: number | null;
      totalCount: number;
    }>>(Prisma.sql`
      WITH variant_stats AS (
        SELECT pv."productId", COALESCE(SUM(pv."stock"), 0)::int AS "totalStock"
        FROM "product_variants" pv
        GROUP BY pv."productId"
      ),
      review_stats AS (
        SELECT
          r."productId",
          COUNT(*) FILTER (WHERE r."isApproved" = true)::int AS "reviewCount",
          AVG(r."rating") FILTER (WHERE r."isApproved" = true)::float8 AS "avgRating"
        FROM "reviews" r
        GROUP BY r."productId"
      )
      SELECT
        p."id",
        p."slug",
        p."sku",
        CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0)), p."price") FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."regularPrice" IS NOT NULL) ELSE p."price" END AS "price",
        p."comparePrice",
        (SELECT MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) AS "minVariantRegularPrice",
      (SELECT MIN(pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."salePrice" IS NOT NULL AND (pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) < COALESCE(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0), p."comparePrice", p."price")) AS "minVariantSalePrice",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."size" IS NOT NULL) AS "hasSizeVariants",
        EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."color" IS NOT NULL) AS "hasColorVariants",
        p."hasVariants",
        (SELECT COUNT(*)::int FROM "product_variants" pv0 WHERE pv0."productId" = p."id") AS "variantCount",
        COALESCE(
          (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
          (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
          p."slug"
        ) AS "name",
        COALESCE(
          (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
          (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
          ''
        ) AS "shortDescription",
        (SELECT ct."name"
         FROM "category_translations" ct
         WHERE ct."categoryId" = p."categoryId" AND ct."locale" IN (${Prisma.join(locales)})
         ORDER BY CASE WHEN ct."locale" = ${locale} THEN 0 ELSE 1 END
         LIMIT 1) AS "category",
        (SELECT pi."id" FROM "product_images" pi WHERE pi."productId" = p."id" ORDER BY pi."order" ASC LIMIT 1) AS "imageId",
        COALESCE(vs."totalStock", 0)::int AS "totalStock",
        COALESCE(rs."reviewCount", 0)::int AS "reviewCount",
        rs."avgRating",
        COUNT(*) OVER()::int AS "totalCount"
      FROM "products" p
      LEFT JOIN variant_stats vs ON vs."productId" = p."id"
      LEFT JOIN review_stats rs ON rs."productId" = p."id"
      WHERE p."isActive" = true
        AND p."isDeleted" = false
        ${categoryId ? Prisma.sql`AND p."categoryId" = ${categoryId}` : Prisma.empty}
        ${minPrice !== undefined ? Prisma.sql`AND ${lowestVariantDisplayPrice} >= ${minPrice}` : Prisma.empty}
        ${maxPrice !== undefined ? Prisma.sql`AND ${lowestVariantDisplayPrice} <= ${maxPrice}` : Prisma.empty}
        ${onSale ? Prisma.sql`AND (p."comparePrice" IS NOT NULL AND p."comparePrice" > p."price" OR EXISTS (SELECT 1 FROM "product_variants" pv2 WHERE pv2."productId" = p."id" AND pv2."salePrice" IS NOT NULL AND (pv2."salePrice" + COALESCE(pv2."priceAdjustment", 0)) < COALESCE(pv2."regularPrice" + COALESCE(pv2."priceAdjustment", 0), p."comparePrice", p."price")))` : Prisma.empty}
        ${featured ? Prisma.sql`AND p."isFeatured" = true` : Prisma.empty}
        ${q ? Prisma.sql`AND (
          p."slug" ILIKE ${`%${q}%`}
          OR p."sku" ILIKE ${`%${q}%`}
          OR EXISTS (SELECT 1 FROM "product_translations" ptq WHERE ptq."productId" = p."id" AND (ptq."name" ILIKE ${`%${q}%`} OR ptq."description" ILIKE ${`%${q}%`}) )
        )` : Prisma.empty}
      ORDER BY ${orderSql}
      OFFSET ${offset}
      LIMIT ${safePageSize}
    `);

    const total = rows[0]?.totalCount ?? 0;
    return {
      products: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice,
        displayPrice: p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
        displayComparePrice: resolveDisplayComparePrice(
      p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
      p.comparePrice,
      p.minVariantSalePrice,
      p.minVariantRegularPrice
    ),
        name: p.name,
        shortDescription: p.shortDescription || '',
        category: p.category || '',
        image: p.imageId ? `/api/images/${p.imageId}` : null,
        totalStock: p.totalStock,
        hasVariants: p.hasVariants,
        hasSizeVariants: p.hasSizeVariants,
        hasColorVariants: p.hasColorVariants,
        minVariantRegularPrice: p.minVariantRegularPrice,
        minVariantSalePrice: p.minVariantSalePrice,
        reviewCount: p.reviewCount,
        avgRating: p.avgRating ?? 0,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  },
  ['amira-all-products-v3'],
  { revalidate: 1, tags: ['amira-products'] }
);

export async function getAllProducts(
  locale: string,
  options: {
    page?: number;
    pageSize?: number;
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating';
    onSale?: boolean;
    featured?: boolean;
  } = {}
) {
  return getAllProductsCached(locale, options);
}

// ============================================================
// SINGLE PRODUCT (for product detail page)
// ============================================================

export const getProductBySlug = unstable_cache(async (slug: string, locale: string) => {
  const rows = await db.$queryRaw<Array<{
    id: string;
    slug: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    minVariantSalePrice: number | null;
    minVariantRegularPrice: number | null;
    differentPriceBySize: boolean;
    costPrice: number | null;
    hasVariants: boolean;
    isFeatured: boolean;
    name: string;
    shortDescription: string | null;
    description: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    breadcrumb: unknown;
    images: unknown;
    variants: unknown;
    tags: unknown;
    reviews: unknown;
    reviewCount: number;
    avgRating: number | null;
    totalStock: number;
    categorySlug: string | null;
    categoryName: string | null;
  }>>(Prisma.sql`
    WITH RECURSIVE ancestors AS (
      SELECT c."id", c."slug", c."parentId", 0 AS depth
      FROM "categories" c
      INNER JOIN "products" p0 ON p0."categoryId" = c."id"
      WHERE p0."slug" = ${slug}

      UNION ALL

      SELECT parent."id", parent."slug", parent."parentId", a.depth + 1
      FROM "categories" parent
      INNER JOIN ancestors a ON a."parentId" = parent."id"
    ),
    selected AS (
      SELECT p.*
      FROM "products" p
      WHERE p."slug" = ${slug}
        AND p."isActive" = true
        AND p."isDeleted" = false
      LIMIT 1
    ),
    review_stats AS (
      SELECT
        r."productId",
        COUNT(*) FILTER (WHERE r."isApproved" = true)::int AS "reviewCount",
        AVG(r."rating") FILTER (WHERE r."isApproved" = true)::float8 AS "avgRating"
      FROM "reviews" r
      INNER JOIN selected p ON p."id" = r."productId"
      GROUP BY r."productId"
    )
    SELECT
      p."id",
      p."slug",
      p."sku",
      p."price",
      p."comparePrice",
      (SELECT MIN(pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."salePrice" IS NOT NULL AND (pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) < COALESCE(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0), p."comparePrice", p."price")) AS "minVariantSalePrice",
      (SELECT MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) AS "minVariantRegularPrice",
      p."differentPriceBySize",
      p."costPrice",
      p."hasVariants",
      p."isFeatured",
      COALESCE(
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        p."slug"
      ) AS "name",
      COALESCE(
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        ''
      ) AS "shortDescription",
      COALESCE(
        (SELECT pt."description" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."description" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        ''
      ) AS "description",
      COALESCE(
        (SELECT pt."metaTitle" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."metaTitle" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1)
      ) AS "metaTitle",
      COALESCE(
        (SELECT pt."metaDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."metaDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1)
      ) AS "metaDescription",
      COALESCE(
        (SELECT json_agg(json_build_object('slug', a."slug", 'name', COALESCE(
          (SELECT ct."name" FROM "category_translations" ct WHERE ct."categoryId" = a."id" AND ct."locale" = ${locale} LIMIT 1),
          (SELECT ct."name" FROM "category_translations" ct WHERE ct."categoryId" = a."id" AND ct."locale" = 'ar' LIMIT 1),
          a."slug"
        )) ORDER BY a.depth DESC) FROM ancestors a),
        '[]'::json
      ) AS "breadcrumb",
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pi."id",
          'altAr', pi."altAr",
          'altEn', pi."altEn",
          'isPrimary', pi."isPrimary",
          'order', pi."order"
        ) ORDER BY pi."order" ASC)
         FROM "product_images" pi WHERE pi."productId" = p."id"),
        '[]'::json
      ) AS "images",
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pv."id",
          'size', pv."size",
          'color', pv."color",
          'colorHex', pv."colorHex",
          'stock', pv."stock",
          'sku', pv."sku",
          'regularPrice', pv."regularPrice",
          'salePrice', pv."salePrice",
          'priceAdjustment', pv."priceAdjustment"
        ) ORDER BY pv."createdAt" ASC)
         FROM "product_variants" pv WHERE pv."productId" = p."id"),
        '[]'::json
      ) AS "variants",
      COALESCE(
        (SELECT json_agg(json_build_object('locale', pt."locale", 'tag', pt."tag") ORDER BY pt."locale", pt."tag")
         FROM "product_tags" pt WHERE pt."productId" = p."id"),
        '[]'::json
      ) AS "tags",
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', r."id",
          'productId', r."productId",
          'userId', r."userId",
          'guestName', r."guestName",
          'guestPhone', r."guestPhone",
          'rating', r."rating",
          'title', r."title",
          'comment', r."comment",
          'isApproved', r."isApproved",
          'createdAt', r."createdAt"
        ) ORDER BY r."createdAt" DESC)
         FROM "reviews" r WHERE r."productId" = p."id" AND r."isApproved" = true),
        '[]'::json
      ) AS "reviews",
      COALESCE(rs."reviewCount", 0)::int AS "reviewCount",
      rs."avgRating",
      COALESCE((SELECT SUM(pv."stock") FROM "product_variants" pv WHERE pv."productId" = p."id"), 0)::int AS "totalStock",
      c."slug" AS "categorySlug",
      COALESCE(
        (SELECT ct."name" FROM "category_translations" ct WHERE ct."categoryId" = c."id" AND ct."locale" = ${locale} LIMIT 1),
        (SELECT ct."name" FROM "category_translations" ct WHERE ct."categoryId" = c."id" AND ct."locale" = 'ar' LIMIT 1),
        c."slug"
      ) AS "categoryName"
    FROM selected p
    LEFT JOIN "categories" c ON c."id" = p."categoryId"
    LEFT JOIN review_stats rs ON rs."productId" = p."id"
  `);

  const product = rows[0];
  if (!product) return null;

  const breadcrumb = Array.isArray(product.breadcrumb)
    ? product.breadcrumb as Array<{ slug: string; name: string }>
    : [{ slug: 'shop', name: locale === 'ar' ? 'المتجر' : 'Shop' }];
  if (breadcrumb[0]?.slug !== 'shop') {
    breadcrumb.unshift({ slug: 'shop', name: locale === 'ar' ? 'المتجر' : 'Shop' });
  }

  const rawImages = (Array.isArray(product.images) ? product.images : []) as Array<{
    id: string;
    altAr: string | null;
    altEn: string | null;
    isPrimary: boolean;
    order: number;
  }>;
  const rawVariants = (Array.isArray(product.variants) ? product.variants : []) as Array<any>;
  const rawTags = (Array.isArray(product.tags) ? product.tags : []) as Array<{ locale: string; tag: string }>;
  const rawReviews = (Array.isArray(product.reviews) ? product.reviews : []).map((review: any) => ({ ...review, createdAt: new Date(review.createdAt) }));

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    comparePrice: product.comparePrice,
    displayPrice: product.minVariantSalePrice ?? product.minVariantRegularPrice ?? product.price,
    displayComparePrice: resolveDisplayComparePrice(
      product.minVariantSalePrice ?? product.minVariantRegularPrice ?? product.price,
      product.comparePrice,
      product.minVariantSalePrice,
      product.minVariantRegularPrice
    ),
    differentPriceBySize: product.differentPriceBySize,
    costPrice: product.costPrice,
    hasVariants: product.hasVariants,
    isFeatured: product.isFeatured,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    breadcrumb,
    images: rawImages.map((img) => ({
      id: img.id,
      url: `/api/images/${img.id}`,
      alt: locale === 'ar' ? img.altAr || product.name : img.altEn || product.name,
      isPrimary: img.isPrimary,
      order: img.order,
    })),
    variants: rawVariants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      sku: v.sku,
      regularPrice: v.regularPrice,
      salePrice: v.salePrice,
      priceAdjustment: v.priceAdjustment,
    })),
    tags: rawTags.filter((t) => t.locale === locale).map((t) => t.tag),
    reviews: rawReviews,
    reviewCount: product.reviewCount,
    avgRating: product.avgRating ?? 0,
    totalStock: product.totalStock,
    category: product.categorySlug
      ? { slug: product.categorySlug, name: product.categoryName || '' }
      : null,
  };
}, ['amira-product-by-slug-v3'], { revalidate: 1, tags: ['amira-products'] });

// ============================================================
// RELATED PRODUCTS (for product detail page)
// ============================================================

export const getRelatedProducts = unstable_cache(async (productId: string, locale: string, limit: number = 6) => {
  const rows = await db.$queryRaw<Array<{
    id: string;
    slug: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    displayPrice: number;
    displayComparePrice: number | null;
    hasVariants: boolean;
    hasSizeVariants: boolean;
    hasColorVariants: boolean;
    minVariantRegularPrice: number | null;
    minVariantSalePrice: number | null;
    name: string;
    shortDescription: string | null;
    category: string | null;
    imageId: string | null;
    totalStock: number;
    reviewCount: number;
    avgRating: number | null;
    variantCount: number;
  }>>(Prisma.sql`
    WITH review_stats AS (
      SELECT r."productId", COUNT(*)::int AS "reviewCount", AVG(r."rating")::float8 AS "avgRating"
      FROM "reviews" r
      WHERE r."isApproved" = true
      GROUP BY r."productId"
    ),
    variant_stats AS (
      SELECT pv."productId", COALESCE(SUM(pv."stock"), 0)::int AS "totalStock"
      FROM "product_variants" pv
      GROUP BY pv."productId"
    )
    SELECT
      p."id",
      p."slug",
      p."sku",
      CASE WHEN p."differentPriceBySize" = true THEN (SELECT COALESCE(MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)), p."price") FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) ELSE p."price" END AS "price",
      p."comparePrice",
      (SELECT MIN(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."regularPrice" IS NOT NULL) AS "minVariantRegularPrice",
      (SELECT MIN(pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."salePrice" IS NOT NULL AND (pv."salePrice" + COALESCE(pv."priceAdjustment", 0)) < COALESCE(pv."regularPrice" + COALESCE(pv."priceAdjustment", 0), p."comparePrice", p."price")) AS "minVariantSalePrice",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."size" IS NOT NULL) AS "hasSizeVariants",
      EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."productId" = p."id" AND pv."color" IS NOT NULL) AS "hasColorVariants",
      p."hasVariants",
      (SELECT COUNT(*)::int FROM "product_variants" pv0 WHERE pv0."productId" = p."id") AS "variantCount",
      COALESCE(
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."name" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        p."slug"
      ) AS "name",
      COALESCE(
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = ${locale} LIMIT 1),
        (SELECT pt."shortDescription" FROM "product_translations" pt WHERE pt."productId" = p."id" AND pt."locale" = 'ar' LIMIT 1),
        ''
      ) AS "shortDescription",
      (SELECT ct."name"
       FROM "category_translations" ct
       WHERE ct."categoryId" = p."categoryId"
         AND ct."locale" IN (${locale}, 'ar')
       ORDER BY CASE WHEN ct."locale" = ${locale} THEN 0 ELSE 1 END
       LIMIT 1) AS "category",
      (SELECT pi."id" FROM "product_images" pi WHERE pi."productId" = p."id" ORDER BY pi."order" ASC LIMIT 1) AS "imageId",
      COALESCE(vs."totalStock", 0)::int AS "totalStock",
      COALESCE(rs."reviewCount", 0)::int AS "reviewCount",
      rs."avgRating"
    FROM "related_products" rel
    INNER JOIN "products" p ON p."id" = rel."relatedProductId"
    LEFT JOIN variant_stats vs ON vs."productId" = p."id"
    LEFT JOIN review_stats rs ON rs."productId" = p."id"
    WHERE rel."productId" = ${productId}
      AND rel."isApproved" = true
      AND p."isActive" = true
      AND p."isDeleted" = false
    ORDER BY rel."createdAt" DESC
    LIMIT ${limit}
  `);

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    comparePrice: p.comparePrice,
    displayPrice: p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
    displayComparePrice: resolveDisplayComparePrice(
      p.minVariantSalePrice ?? p.minVariantRegularPrice ?? p.price,
      p.comparePrice,
      p.minVariantSalePrice,
      p.minVariantRegularPrice
    ),
    name: p.name,
    shortDescription: p.shortDescription || '',
    category: p.category || '',
    image: p.imageId ? `/api/images/${p.imageId}` : null,
    totalStock: p.totalStock,
    hasVariants: p.hasVariants,
    hasSizeVariants: p.hasSizeVariants,
    hasColorVariants: p.hasColorVariants,
    minVariantRegularPrice: p.minVariantRegularPrice,
    minVariantSalePrice: p.minVariantSalePrice,
    reviewCount: p.reviewCount,
    avgRating: p.avgRating ?? 0,
  }));
}, ['amira-related-products-v3'], { revalidate: 1, tags: ['amira-products'] });
