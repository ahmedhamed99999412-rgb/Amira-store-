import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { updateAdminProductSchema } from '@/lib/validation/admin-product';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// GET /api/admin/products/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const locale = req.headers.get('x-locale') || 'ar';
    const p = await db.product.findUnique({ where: { id }, include: { translations: true, images: { orderBy: { order: 'asc' } }, variants: true, tags: true, category: { include: { translations: true } } } });
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: { id: p.id, slug: p.slug, sku: p.sku, categoryId: p.categoryId, price: p.price, comparePrice: p.comparePrice, costPrice: p.costPrice, differentPriceBySize: p.differentPriceBySize, hasVariants: p.hasVariants, isActive: p.isActive, isFeatured: p.isFeatured, isDeleted: p.isDeleted, nameAr: p.translations.find((t) => t.locale === 'ar')?.name || '', nameEn: p.translations.find((t) => t.locale === 'en')?.name || '', shortDescriptionAr: p.translations.find((t) => t.locale === 'ar')?.shortDescription || '', shortDescriptionEn: p.translations.find((t) => t.locale === 'en')?.shortDescription || '', descriptionAr: p.translations.find((t) => t.locale === 'ar')?.description || '', descriptionEn: p.translations.find((t) => t.locale === 'en')?.description || '', images: p.images, variants: p.variants, tagsAr: p.tags.filter((t) => t.locale === 'ar').map((t) => t.tag), tagsEn: p.tags.filter((t) => t.locale === 'en').map((t) => t.tag), category: p.category } });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); } return internalServerErrorResponse(); }
}

// PUT /api/admin/products/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await safeJsonBody(req);
    const parsed = updateAdminProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const input = parsed.data;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const nextPrice = input.price ?? existing.price;
    const nextComparePrice = input.comparePrice !== undefined ? input.comparePrice : existing.comparePrice;
    if (nextComparePrice !== null && nextComparePrice <= nextPrice) {
      return NextResponse.json({ error: 'Sale price must be lower than regular price' }, { status: 400 });
    }
    if (input.differentPriceBySize && input.variants?.some((variant) => variant.size && variant.salePrice !== undefined && variant.salePrice !== null && variant.regularPrice !== undefined && variant.regularPrice !== null && variant.salePrice >= variant.regularPrice)) {
      return NextResponse.json({ error: 'Each size sale price must be lower than its regular price' }, { status: 400 });
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await db.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (slugConflict && slugConflict.id !== id) return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }
    if (input.sku && input.sku !== existing.sku) {
      const skuConflict = await db.product.findUnique({ where: { sku: input.sku }, select: { id: true } });
      if (skuConflict && skuConflict.id !== id) return NextResponse.json({ error: 'SKU exists' }, { status: 409 });
    }
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const categoryExists = await db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
      if (!categoryExists) return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: {
        slug: input.slug ?? existing.slug,
        sku: input.sku ?? existing.sku,
        categoryId: input.categoryId ?? existing.categoryId,
        price: input.price ?? existing.price,
        comparePrice: input.comparePrice !== undefined ? input.comparePrice : existing.comparePrice,
        costPrice: input.costPrice !== undefined ? input.costPrice : existing.costPrice,
        differentPriceBySize: input.differentPriceBySize ?? existing.differentPriceBySize,
        hasVariants: input.hasVariants ?? existing.hasVariants,
        isActive: input.isActive ?? existing.isActive,
        isFeatured: input.isFeatured ?? existing.isFeatured,
      }});

      if (input.deletedImageIds?.length) {
        await tx.productImage.deleteMany({ where: { id: { in: input.deletedImageIds }, productId: id } });
      }

      if (input.newImages?.length) {
        const existingCount = await tx.productImage.count({ where: { productId: id } });
        await tx.productImage.createMany({
          data: input.newImages.map((img, i) => ({
            productId: id,
            base64Data: img.base64Data,
            mimeType: img.mimeType,
            fileSize: img.fileSize,
            order: existingCount + i,
            isPrimary: false,
          })),
        });
      }

      for (const locale of ['ar', 'en'] as const) {
        const d = locale === 'ar'
          ? { name: input.nameAr, shortDescription: input.shortDescriptionAr, description: input.descriptionAr }
          : { name: input.nameEn, shortDescription: input.shortDescriptionEn, description: input.descriptionEn };
        const hasAny = d.name !== undefined || d.shortDescription !== undefined || d.description !== undefined;
        if (!hasAny) continue;
        const ex = await tx.productTranslation.findUnique({ where: { productId_locale: { productId: id, locale } } });
        if (ex) {
          await tx.productTranslation.update({
            where: { productId_locale: { productId: id, locale } },
            data: {
              ...(d.name !== undefined ? { name: d.name } : {}),
              ...(d.shortDescription !== undefined ? { shortDescription: d.shortDescription } : {}),
              ...(d.description !== undefined ? { description: d.description } : {}),
            },
          });
        } else if (d.name) {
          await tx.productTranslation.create({ data: { productId: id, locale, name: d.name, shortDescription: d.shortDescription || null, description: d.description || null } });
        }
      }

      if (input.tagsAr !== undefined || input.tagsEn !== undefined) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        const tagsAr = input.tagsAr ?? [];
        const tagsEn = input.tagsEn ?? [];
        if (tagsAr.length || tagsEn.length) {
          await tx.productTag.createMany({ data: [
            ...tagsAr.map((tag) => ({ productId: id, locale: 'ar', tag })),
            ...tagsEn.map((tag) => ({ productId: id, locale: 'en', tag })),
          ] });
        }
      }

      if (input.variants !== undefined && input.variants.length > 0) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id }, select: { id: true } });
        const existingIds = new Set(existingVariants.map((variant) => variant.id));
        const incomingIds = new Set<string>();

        for (const rawVariant of input.variants) {
          const variantId = rawVariant.id ?? null;
          const data = {
            size: rawVariant.size ?? null,
            color: rawVariant.color ?? null,
            colorHex: rawVariant.colorHex ?? null,
            stock: rawVariant.stock,
            sku: rawVariant.sku ?? null,
            regularPrice: rawVariant.regularPrice ?? null,
            salePrice: rawVariant.salePrice ?? null,
            priceAdjustment: 0,
          };

          if (variantId && existingIds.has(variantId)) {
            incomingIds.add(variantId);
            await tx.productVariant.update({ where: { id: variantId }, data });
          } else if (variantId) {
            throw new Error('Invalid variant id');
          } else {
            await tx.productVariant.create({ data: { productId: id, ...data } });
          }
        }

        for (const removed of existingVariants.filter((variant) => !incomingIds.has(variant.id))) {
          const [cartRefs, orderRefs] = await Promise.all([
            tx.cartItem.count({ where: { variantId: removed.id } }),
            tx.orderItem.count({ where: { variantId: removed.id } }),
          ]);
          if (cartRefs === 0 && orderRefs === 0) {
            await tx.productVariant.delete({ where: { id: removed.id } });
          } else {
            await tx.productVariant.update({ where: { id: removed.id }, data: { stock: 0 } });
          }
        }
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); } return internalServerErrorResponse(); }
}

// DELETE /api/admin/products/[id] - Soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.product.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date(), isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); } return internalServerErrorResponse(); }
}
