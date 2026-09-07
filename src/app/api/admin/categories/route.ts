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
      include: { translations: true, image: true },
      orderBy: { order: 'asc' },
    });
    const childrenByParent = new Map<string | null, typeof cats>();
    for (const category of cats) {
      const children = childrenByParent.get(category.parentId) || [];
      children.push(category);
      childrenByParent.set(category.parentId, children);
    }

    async function buildTree(parentId: string | null): Promise<unknown[]> {
      return Promise.all((childrenByParent.get(parentId) || []).map(async (category) => ({
        id: category.id,
        parentId: category.parentId,
        slug: category.slug,
        name: getName(category.translations, locale, category.slug),
        nameAr: category.translations.find((t) => t.locale === 'ar')?.name || '',
        nameEn: category.translations.find((t) => t.locale === 'en')?.name || '',
        order: category.order,
        isActive: category.isActive,
        image: category.image,
        productCount: await countProducts(category.id),
        children: await buildTree(category.id),
      })));
    }

    const tree = await buildTree(null);

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
