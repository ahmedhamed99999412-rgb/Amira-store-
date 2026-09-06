import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { createAdminCategorySchema } from '@/lib/validation/admin-category';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// Recursive function to count products in a category and all its descendants
async function countProducts(catId: string): Promise<number> {
  const direct = await db.product.count({ where: { categoryId: catId, isDeleted: false } });
  const children = await db.category.findMany({ where: { parentId: catId }, select: { id: true } });
  let total = direct;
  for (const child of children) {
    total += await countProducts(child.id);
  }
  return total;
}

// Helper to get localized name
function getName(translations: any[], locale: string, fallback: string): string {
  return translations.find((t) => t.locale === locale)?.name ||
    translations.find((t) => t.locale === 'ar')?.name ||
    fallback;
}

// GET /api/admin/categories - Full tree with product counts
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const locale = req.headers.get('x-locale') || 'ar';

    const cats = await db.category.findMany({
      where: { parentId: null },
      include: {
        translations: true,
        image: true,
        children: {
          include: {
            translations: true,
            image: true,
            children: {
              include: { translations: true, image: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    const tree = await Promise.all(
      cats.map(async (c) => {
        const productCount = await countProducts(c.id);
        const children = await Promise.all(
          c.children.map(async (ch) => {
            const childProductCount = await countProducts(ch.id);
            return {
              id: ch.id,
              slug: ch.slug,
              name: getName(ch.translations, locale, ch.slug),
              nameAr: ch.translations.find((t) => t.locale === 'ar')?.name || '',
              nameEn: ch.translations.find((t) => t.locale === 'en')?.name || '',
              order: ch.order,
              isActive: ch.isActive,
              image: ch.image,
              productCount: childProductCount,
              children: ch.children.map((gc) => ({
                id: gc.id,
                slug: gc.slug,
                name: getName(gc.translations, locale, gc.slug),
                nameAr: gc.translations.find((t) => t.locale === 'ar')?.name || '',
                nameEn: gc.translations.find((t) => t.locale === 'en')?.name || '',
                order: gc.order,
                isActive: gc.isActive,
                image: gc.image,
              })),
            };
          })
        );

        return {
          id: c.id,
          slug: c.slug,
          name: getName(c.translations, locale, c.slug),
          nameAr: c.translations.find((t) => t.locale === 'ar')?.name || '',
          nameEn: c.translations.find((t) => t.locale === 'en')?.name || '',
          order: c.order,
          isActive: c.isActive,
          image: c.image,
          productCount,
          children,
        };
      })
    );

    return NextResponse.json({ categories: tree });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return internalServerErrorResponse();
  }
}

// POST /api/admin/categories - Create category
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await safeJsonBody(req);
    if (body === null) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    const parsed = createAdminCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid category data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { parentId, slug, nameAr, nameEn, descriptionAr, descriptionEn, image } = parsed.data;
    if (parentId) {
      const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
    }
    if (await db.category.findUnique({ where: { slug } })) {
      return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    const maxOrder = await db.category.aggregate({
      where: parentId ? { parentId } : { parentId: null },
      _max: { order: true },
    });

    const category = await db.category.create({
      data: {
        parentId: parentId || null,
        slug,
        order: (maxOrder._max.order || -1) + 1,
        isActive: true,
        translations: {
          create: [
            { locale: 'ar', name: nameAr, description: descriptionAr || null },
            { locale: 'en', name: nameEn, description: descriptionEn || null },
          ],
        },
        ...(image
          ? {
              image: {
                create: {
                  base64Data: image.base64Data,
                  mimeType: image.mimeType,
                  fileSize: image.fileSize,
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ category, ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return internalServerErrorResponse();
  }
}
