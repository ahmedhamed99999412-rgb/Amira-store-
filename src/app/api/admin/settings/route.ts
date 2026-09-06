import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { adminSettingsSchema } from '@/lib/validation/admin-settings';

// GET /api/admin/settings
export async function GET() {
  try {
    await requireAdmin();
    const settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return internalServerErrorResponse();
  }
}

// PUT /api/admin/settings
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await safeJsonBody(req);
    const parsed = adminSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings data', issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) },
        { status: 400 }
      );
    }

    const { whatsappNumber, storeNameAr, storeNameEn, email, addressAr, addressEn, currency, freeShippingEnabled, freeShippingMinOrder, freeShippingStart, freeShippingEnd, announcementAr, announcementEn } = parsed.data;
    const startDate = freeShippingStart ? new Date(freeShippingStart) : null;
    const endDate = freeShippingEnd ? new Date(freeShippingEnd) : null;
    const settings = await db.storeSettings.upsert({
      where: { id: 'singleton' },
      update: { whatsappNumber: whatsappNumber || undefined, storeNameAr: storeNameAr || undefined, storeNameEn: storeNameEn || undefined, email: email !== undefined ? email || null : undefined, addressAr: addressAr !== undefined ? addressAr || null : undefined, addressEn: addressEn !== undefined ? addressEn || null : undefined, currency: currency || undefined, freeShippingEnabled: freeShippingEnabled !== undefined ? !!freeShippingEnabled : undefined, freeShippingMinOrder: freeShippingMinOrder !== undefined ? (freeShippingMinOrder !== null ? freeShippingMinOrder : null) : undefined, freeShippingStart: freeShippingStart !== undefined ? startDate : undefined, freeShippingEnd: freeShippingEnd !== undefined ? endDate : undefined, announcementAr: announcementAr || undefined, announcementEn: announcementEn || undefined },
      create: { id: 'singleton', whatsappNumber: whatsappNumber || '01019003677', storeNameAr: storeNameAr || 'أميرا ستور', storeNameEn: storeNameEn || 'AMIRA STORE', email: email || null, currency: currency || 'EGP', freeShippingEnabled: !!freeShippingEnabled, freeShippingMinOrder: freeShippingMinOrder !== undefined ? freeShippingMinOrder : null, freeShippingStart: startDate, freeShippingEnd: endDate, announcementAr: announcementAr || '', announcementEn: announcementEn || '' },
    });
    return NextResponse.json({ settings, ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return internalServerErrorResponse();
  }
}
