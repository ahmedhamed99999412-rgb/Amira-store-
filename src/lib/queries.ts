import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ============================================================
// STORE SETTINGS
// ============================================================

// Get store settings (singleton record)
export async function getStoreSettings() {
  const settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    throw new Error('Store settings not found. Run db:seed.');
  }
  return settings;
}

// ============================================================
// CATEGORIES (for navigation and homepage)
// ============================================================

// Get all main categories (parentId = null) with their translations and children
// Used for: Header navigation, Category circles on homepage
export async function getMainCategories(locale: string) {
  const categories = await db.category.findMany({
    where: { parentId: null, isActive: true },
    include: {
      translations: true,
      image: true,
      children: {
        where: { isActive: true },
        include: { translations: true },
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
}

// ============================================================
// BANNERS (hero and promo)
// ============================================================

// Get active hero banners (ordered)
export async function getHeroBanners() {
  return db.banner.findMany({
    where: { type: 'HERO', isActive: true },
    orderBy: { order: 'asc' },
  });
}

// Get active promo banners (ordered)
export async function getPromoBanners() {
  return db.banner.findMany({
    where: { type: 'PROMO', isActive: true },
    orderBy: { order: 'asc' },
  });
}

// ============================================================
// PRODUCTS (for homepage trending section)
// ============================================================

// Get featured products for "Trending Now" section
// Returns products with: translations, first image, variants (for stock), reviews (for rating)
export async function getFeaturedProducts(locale: string, limit: number = 12) {
  const products = await db.product.findMany({
    where: { isActive: true, isDeleted: false, isFeatured: true },
    include: {
      translations: true,
      images: { orderBy: { order: 'asc' } },
      variants: true,
      reviews: { where: { isApproved: true } },
      category: { include: { translations: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    comparePrice: p.comparePrice,
    name:
      p.translations.find((t) => t.locale === locale)?.name ||
      p.translations.find((t) => t.locale === 'ar')?.name ||
      p.slug,
    shortDescription:
      p.translations.find((t) => t.locale === locale)?.shortDescription || '',
    category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
    image: p.images[0] ? `/api/images/${p.images[0].id}` : null,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    reviewCount: p.reviews.length,
    avgRating:
      p.reviews.length > 0
        ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
        : 0,
  }));
}

// ============================================================
// CATEGORY (for category page)
// ============================================================

// Get a category by slug with full tree info (parent chain, children, products)
export async function getCategoryBySlug(slug: string, locale: string) {
  const category = await db.category.findUnique({
    where: { slug },
    include: {
      translations: true,
      image: true,
      parent: {
        include: {
          translations: true,
          parent: { include: { translations: true, parent: { include: { translations: true } } } },
        },
      },
      children: {
        where: { isActive: true },
        include: {
          translations: true,
          image: true,
          children: {
            where: { isActive: true },
            include: { translations: true },
            orderBy: { order: 'asc' },
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
}

// ============================================================
// PRODUCTS BY CATEGORY (for category page)
// ============================================================

// Get products by category (including all descendant categories) with filtering & pagination
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
  const { page = 1, pageSize = 12, minPrice, maxPrice, sort = 'newest', onSale } = options;

  // Find the category and all descendant category IDs (recursive)
  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { products: [], total: 0, page, pageSize, totalPages: 0 };

  // Recursively collect all descendant category IDs
  const categoryIds = new Set<string>([category.id]);
  const stack = [category.id];
  while (stack.length > 0) {
    const parentId = stack.pop()!;
    const children = await db.category.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const child of children) {
      if (!categoryIds.has(child.id)) {
        categoryIds.add(child.id);
        stack.push(child.id);
      }
    }
  }

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isDeleted: false,
    categoryId: { in: Array.from(categoryIds) },
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(onSale ? { comparePrice: { not: null } } : {}),
  };

  // Build order by
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price-asc'
      ? { price: 'asc' }
      : sort === 'price-desc'
      ? { price: 'desc' }
      : sort === 'rating'
      ? { reviews: { _count: 'desc' } }
      : { createdAt: 'desc' };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: {
        translations: true,
        images: { orderBy: { order: 'asc' } },
        variants: true,
        reviews: { where: { isApproved: true } },
        category: { include: { translations: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      comparePrice: p.comparePrice,
      name:
        p.translations.find((t) => t.locale === locale)?.name ||
        p.translations.find((t) => t.locale === 'ar')?.name ||
        p.slug,
      shortDescription:
        p.translations.find((t) => t.locale === locale)?.shortDescription || '',
      category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
      image: p.images[0]
        ? `/api/images/${p.images[0].id}`
        : null,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      reviewCount: p.reviews.length,
      avgRating:
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// ALL PRODUCTS (for shop page with search/filter)
// ============================================================

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
  const { page = 1, pageSize = 12, q, categoryId, minPrice, maxPrice, sort = 'newest', onSale, featured } = options;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isDeleted: false,
    ...(categoryId ? { categoryId } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(onSale ? { comparePrice: { not: null } } : {}),
    ...(featured ? { isFeatured: true } : {}),
    ...(q
      ? {
          OR: [
            { slug: { contains: q } },
            { sku: { contains: q } },
            { translations: { some: { name: { contains: q } } } },
            { translations: { some: { description: { contains: q } } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price-asc'
      ? { price: 'asc' }
      : sort === 'price-desc'
      ? { price: 'desc' }
      : sort === 'rating'
      ? { reviews: { _count: 'desc' } }
      : { createdAt: 'desc' };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: {
        translations: true,
        images: { orderBy: { order: 'asc' } },
        variants: true,
        reviews: { where: { isApproved: true } },
        category: { include: { translations: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      comparePrice: p.comparePrice,
      name:
        p.translations.find((t) => t.locale === locale)?.name ||
        p.translations.find((t) => t.locale === 'ar')?.name ||
        p.slug,
      shortDescription:
        p.translations.find((t) => t.locale === locale)?.shortDescription || '',
      category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
      image: p.images[0]
        ? `/api/images/${p.images[0].id}`
        : null,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      reviewCount: p.reviews.length,
      avgRating:
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// SINGLE PRODUCT (for product detail page)
// ============================================================

export async function getProductBySlug(slug: string, locale: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      translations: true,
      tags: true,
      images: { orderBy: { order: 'asc' } },
      variants: true,
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
      },
      category: {
        include: {
          translations: true,
          parent: { include: { translations: true } },
        },
      },
    },
  });

  if (!product || !product.isActive || product.isDeleted) return null;

  // Get translation for current locale (fallback to Arabic)
  const tr =
    product.translations.find((t) => t.locale === locale) ||
    product.translations.find((t) => t.locale === 'ar');
  if (!tr) return null;

  // Build breadcrumb: Shop > [parent category] > [category]
  const breadcrumb: { slug: string; name: string }[] = [
    { slug: 'shop', name: locale === 'ar' ? 'المتجر' : 'Shop' },
  ];
  if (product.category) {
    if (product.category.parent) {
      const parentName =
        product.category.parent.translations.find((t) => t.locale === locale)?.name ||
        product.category.parent.translations.find((t) => t.locale === 'ar')?.name ||
        product.category.parent.slug;
      breadcrumb.push({ slug: product.category.parent.slug, name: parentName });
    }
    const catName =
      product.category.translations.find((t) => t.locale === locale)?.name ||
      product.category.translations.find((t) => t.locale === 'ar')?.name ||
      product.category.slug;
    breadcrumb.push({ slug: product.category.slug, name: catName });
  }

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    comparePrice: product.comparePrice,
    costPrice: product.costPrice,
    hasVariants: product.hasVariants,
    isFeatured: product.isFeatured,
    name: tr.name,
    shortDescription: tr.shortDescription,
    description: tr.description,
    metaTitle: tr.metaTitle,
    metaDescription: tr.metaDescription,
    breadcrumb,
    images: product.images.map((img) => ({
      id: img.id,
      url: `/api/images/${img.id}`,
      alt: locale === 'ar' ? img.altAr || tr.name : img.altEn || tr.name,
      isPrimary: img.isPrimary,
      order: img.order,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      sku: v.sku,
      priceAdjustment: v.priceAdjustment,
    })),
    tags: product.tags.filter((t) => t.locale === locale).map((t) => t.tag),
    reviews: product.reviews,
    reviewCount: product.reviews.length,
    avgRating:
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0,
    totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
    category: product.category
      ? {
          slug: product.category.slug,
          name: product.category.translations.find((t) => t.locale === locale)?.name || '',
        }
      : null,
  };
}

// ============================================================
// RELATED PRODUCTS (for product detail page)
// ============================================================

export async function getRelatedProducts(productId: string, locale: string, limit: number = 6) {
  const relations = await db.relatedProduct.findMany({
    where: {
      productId,
      isApproved: true,
    },
    include: {
      relatedProduct: {
        include: {
          translations: true,
          images: { orderBy: { order: 'asc' } },
          variants: true,
          reviews: { where: { isApproved: true } },
          category: { include: { translations: true } },
        },
      },
    },
    take: limit,
  });

  return relations.map((r) => {
    const p = r.relatedProduct;
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      comparePrice: p.comparePrice,
      name:
        p.translations.find((t) => t.locale === locale)?.name ||
        p.translations.find((t) => t.locale === 'ar')?.name ||
        p.slug,
      shortDescription:
        p.translations.find((t) => t.locale === locale)?.shortDescription || '',
      category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
      image: p.images[0]
        ? `/api/images/${p.images[0].id}`
        : null,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      reviewCount: p.reviews.length,
      avgRating:
        p.reviews.length > 0
          ? p.reviews.reduce((sum, rev) => sum + rev.rating, 0) / p.reviews.length
          : 0,
    };
  });
}
