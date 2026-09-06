import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isValidEgyptianPhone } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// PUT /api/auth/profile
// Updates the user's profile (fullName, phone)
// Body: { fullName?, phone? }
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { fullName, phone } = body as Record<string, unknown>;
    if (fullName !== undefined && fullName !== null && typeof fullName !== 'string') {
      return NextResponse.json({ error: 'Invalid full name' }, { status: 400 });
    }
    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const locale = req.headers.get('x-locale') || 'ar';
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    // If phone is being changed, validate and check uniqueness
    if (typeof phone === 'string' && phone.trim() && phone.trim() !== user.phone) {
      if (!isValidEgyptianPhone(phone)) {
        return NextResponse.json({ error: t('invalidPhone') }, { status: 400 });
      }
      const existing = await db.user.findUnique({ where: { phone: phone.trim() } });
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: t('phoneExists') }, { status: 409 });
      }
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(typeof fullName === 'string' ? { fullName: fullName.trim().slice(0, 120) || null } : {}),
        ...(typeof phone === 'string' && phone.trim() ? { phone: phone.trim() } : {}),
      },
      select: { id: true, username: true, phone: true, fullName: true, role: true },
    });

    return NextResponse.json({ user: updated, ok: true });
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return internalServerErrorResponse();
  }
}
