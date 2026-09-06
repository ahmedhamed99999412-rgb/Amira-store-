import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { updateAdminCategorySchema } from '@/lib/validation/admin-category';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// PUT /api/admin/categories/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await safeJsonBody(req);
    const parsed = updateAdminCategorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid category data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const input = parsed.data;
    const ex = await db.category.findUnique({ where: { id } });
    if (!ex) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (input.slug && input.slug !== ex.slug) {
      const slugConflict = await db.category.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (slugConflict && slugConflict.id !== id) return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data: { slug: input.slug ?? ex.slug, isActive: input.isActive ?? ex.isActive } });
      for (const locale of ['ar', 'en'] as const) {
        const d = locale === 'ar' ? { name: input.nameAr, description: input.descriptionAr } : { name: input.nameEn, description: input.descriptionEn };
        const hasAny = d.name !== undefined || d.description !== undefined;
        if (!hasAny) continue;
        const exTr = await tx.categoryTranslation.findUnique({ where: { categoryId_locale: { categoryId: id, locale } } });
        if (exTr) {
          await tx.categoryTranslation.update({
            where: { categoryId_locale: { categoryId: id, locale } },
            data: { ...(d.name !== undefined ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}) },
          });
        } else if (d.name) {
          await tx.categoryTranslation.create({ data: { categoryId: id, locale, name: d.name, description: d.description || null } });
        }
      }
      if (input.image) {
        await tx.categoryImage.deleteMany({ where: { categoryId: id } });
        await tx.categoryImage.create({ data: { categoryId: id, base64Data: input.image.base64Data, mimeType: input.image.mimeType, fileSize: input.image.fileSize } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (await db.product.count({ where: { categoryId: id, isDeleted: false } }) > 0) return NextResponse.json({ error: 'Cannot delete category with products' }, { status: 400 });
    if (await db.category.count({ where: { parentId: id } }) > 0) return NextResponse.json({ error: 'Cannot delete category with subcategories' }, { status: 400 });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}
