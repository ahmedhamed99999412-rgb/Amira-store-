import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { createAdminBannerSchema } from '@/lib/validation/admin-banner';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// GET /api/admin/banners
export async function GET() {
  try {
    await requireAdmin();
    const banners = await db.banner.findMany({ orderBy: [{ type: 'asc' }, { order: 'asc' }] });
    return NextResponse.json({ banners });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}

// POST /api/admin/banners
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await safeJsonBody(req);
    const parsed = createAdminBannerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid banner data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { type, base64Data, mimeType, fileSize, titleAr, titleEn, subtitleAr, subtitleEn, ctaTextAr, ctaTextEn, ctaLink, order, isActive } = parsed.data;
    const maxOrder = await db.banner.aggregate({ where: { type }, _max: { order: true } });
    const banner = await db.banner.create({ data: { type, base64Data, mimeType, fileSize, titleAr: titleAr || null, titleEn: titleEn || null, subtitleAr: subtitleAr || null, subtitleEn: subtitleEn || null, ctaTextAr: ctaTextAr || null, ctaTextEn: ctaTextEn || null, ctaLink: ctaLink || null, order: order !== undefined ? order : (maxOrder._max.order || -1) + 1, isActive: isActive !== false } });
    return NextResponse.json({ banner, ok: true });
  } catch (e: unknown) { const message = e instanceof Error ? e.message : ''; if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return internalServerErrorResponse(); }
}
