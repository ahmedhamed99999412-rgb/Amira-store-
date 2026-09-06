import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { updateAdminBannerSchema } from '@/lib/validation/admin-banner';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// PUT /api/admin/banners/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await safeJsonBody(req);
    const parsed = updateAdminBannerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid banner data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const input = parsed.data;
    const ex = await db.banner.findUnique({ where: { id } });
    if (!ex) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const banner = await db.banner.update({ where: { id }, data: { ...(input.type ? { type: input.type } : {}), ...(input.base64Data ? { base64Data: input.base64Data, mimeType: input.mimeType!, fileSize: input.fileSize! } : {}), titleAr: input.titleAr !== undefined ? input.titleAr || null : ex.titleAr, titleEn: input.titleEn !== undefined ? input.titleEn || null : ex.titleEn, subtitleAr: input.subtitleAr !== undefined ? input.subtitleAr || null : ex.subtitleAr, subtitleEn: input.subtitleEn !== undefined ? input.subtitleEn || null : ex.subtitleEn, ctaTextAr: input.ctaTextAr !== undefined ? input.ctaTextAr || null : ex.ctaTextAr, ctaTextEn: input.ctaTextEn !== undefined ? input.ctaTextEn || null : ex.ctaTextEn, ctaLink: input.ctaLink !== undefined ? input.ctaLink || null : ex.ctaLink, order: input.order !== undefined ? input.order : ex.order, isActive: input.isActive !== undefined ? input.isActive : ex.isActive } });
    return NextResponse.json({ banner, ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}

// DELETE /api/admin/banners/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.banner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}
