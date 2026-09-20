import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { createAdminProductSchema } from '@/lib/validation/admin-product';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { productNeedsVariantSelection } from '@/lib/product-variants';

// GET /api/admin/products - List all products
export async function GET(req: NextRequest) {
  const locale = req.headers.get('x-locale') || 'ar';
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;

    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        ...(q ? { OR: [{ slug: { contains: q } }, { sku: { contains: q } }, { translations: { some: { name: { contains: q } } } }] } : {}),
      },
      include: {
        translations: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
        variants: true,
        category: { include: { translations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      products: products.map((p) => {
        const hasSizeVariants = p.variants.some((v) => v.size);
        const hasColorVariants = p.variants.some((v) => v.color);
        return {
          id: p.id, slug: p.slug, sku: p.sku,
          price: p.differentPriceBySize && p.variants.length > 0
            ? Math.min(...p.variants.map((v) => v.regularPrice ?? p.price))
            : p.price,
          comparePrice: p.comparePrice,
          differentPriceBySize: p.differentPriceBySize,
          isActive: p.isActive, isFeatured: p.isFeatured, isDeleted: p.isDeleted,
          nameAr: p.translations.find((t) => t.locale === 'ar')?.name || '',
          nameEn: p.translations.find((t) => t.locale === 'en')?.name || '',
          image: p.images[0] ? `/api/images/${p.images[0].id}` : null,
          totalStock: p.variants.reduce((s, v) => s + v.stock, 0),
          hasSizeVariants,
          hasColorVariants,
          variants: p.variants.map((v) => ({
            size: v.size,
            color: v.color,
            regularPrice: v.regularPrice,
            salePrice: v.salePrice,
            stock: v.stock,
          })),
          category: p.category ? { id: p.category.id, slug: p.category.slug, name: p.category.translations.find((t) => t.locale === locale)?.name || p.category.slug } : null,
        };
      }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return apiErrorResponse('FORBIDDEN', 403, locale);
    return internalServerErrorResponse();
  }
}

// POST /api/admin/products - Create product
export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    await requireAdmin();
    const body = await safeJsonBody(req);
    const parsed = createAdminProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { sku: providedSku, slug: providedSlug, categoryId, price, comparePrice, costPrice, differentPriceBySize, hasVariants: submittedHasVariants, isActive, isFeatured, nameAr, nameEn, shortDescriptionAr, shortDescriptionEn, descriptionAr, descriptionEn, tagsAr, tagsEn, images, variants } = parsed.data;
    // `hasVariants` is never trusted from the submitted form value alone —
    // it is derived from the actual variants being saved in this same
    // request, so the stored flag can never drift out of sync with reality
    // the way a manually-toggled checkbox can. `submittedHasVariants` is
    // intentionally unused below other than to keep it out of `...rest`
    // spreads; every consumer of "does this product need a variant picker"
    // (cards, cart API, wishlist) is derived the same way at read time too.
    void submittedHasVariants;
    const hasVariants = productNeedsVariantSelection(variants);
    if (comparePrice !== undefined && comparePrice !== null && price !== null && comparePrice <= price) {
      return NextResponse.json({ error: 'Sale price must be lower than regular price' }, { status: 400 });
    }
    if (differentPriceBySize && variants.some((variant) => variant.size && variant.salePrice !== undefined && variant.salePrice !== null && variant.regularPrice !== undefined && variant.regularPrice !== null && variant.salePrice >= variant.regularPrice)) {
      return NextResponse.json({ error: 'Each size sale price must be lower than its regular price' }, { status: 400 });
    }

    // Auto-generate SKU if not provided (unique) - fast deterministic generation
    let sku = providedSku;
    if (!sku) {
      const generateFastSKU = (name: string): string => {
        const code = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PRD';
        const random = Math.floor(100 + Math.random() * 900);
        return `AMS-${code}${random}`;
      };
      let attempts = 0;
      while (attempts < 3) {
        const generated = generateFastSKU(nameEn || nameAr);
        const exists = await db.product.findUnique({ where: { sku: generated }, select: { id: true } });
        if (!exists) {
          sku = generated;
          break;
        }
        attempts++;
      }
      if (!sku) {
        sku = `AMS-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
      }
    } else {
      if (await db.product.findUnique({ where: { slug: providedSlug || sku } })) return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    // Auto-generate slug from English name if not provided
    let slug = providedSlug;
    if (!slug) {
      const baseSlug = nameEn
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      slug = baseSlug;
      // Ensure uniqueness
      let counter = 1;
      while (await db.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    } else {
      if (await db.product.findUnique({ where: { slug } })) return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    if (await db.product.findUnique({ where: { sku } })) return NextResponse.json({ error: 'SKU exists' }, { status: 409 });

    const categoryCheck = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!categoryCheck) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const product = await db.product.create({
      data: {
        slug, sku, categoryId, price: price ?? 0, comparePrice: comparePrice ?? null,
        differentPriceBySize,
        costPrice: costPrice ?? null, hasVariants,
        isActive: isActive !== false, isFeatured: !!isFeatured,
        translations: { create: [{ locale: 'ar', name: nameAr, shortDescription: shortDescriptionAr || null, description: descriptionAr || null }, { locale: 'en', name: nameEn, shortDescription: shortDescriptionEn || null, description: descriptionEn || null }] },
        images: images.length > 0 ? { create: images.map((img, i) => ({ base64Data: img.base64Data, mimeType: img.mimeType, fileSize: img.fileSize || 0, order: i, isPrimary: i === 0 })) } : undefined,
        variants: variants.length > 0 ? { create: variants.map((v) => ({ size: v.size || null, color: v.color || null, colorHex: v.colorHex || null, stock: v.stock, sku: v.sku || null, regularPrice: v.regularPrice ?? null, salePrice: v.salePrice ?? null, priceAdjustment: 0 })) } : { create: [{ stock: 0 }] },
        tags: { create: [...tagsAr.map((t: string) => ({ locale: 'ar', tag: t })), ...tagsEn.map((t: string) => ({ locale: 'en', tag: t }))] },
      },
    });
    revalidatePath('/admin/products', 'page');
    revalidatePath('/', 'layout');
    revalidatePath('/ar', 'page');
    revalidatePath('/en', 'page');
    revalidatePath('/ar/shop', 'page');
    revalidatePath('/en/shop', 'page');
    revalidateTag('amira-products', 'layout');
    return NextResponse.json({ product, ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return apiErrorResponse('FORBIDDEN', 403, locale);
    return internalServerErrorResponse();
  }
}
