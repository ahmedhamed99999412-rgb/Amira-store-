import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isValidEgyptianPhone } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function PUT(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const limited = await rateLimit(req, 'auth:profile', 20, 10 * 60_000, user.id);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null || !body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const { fullName, phone } = body as Record<string, unknown>;
    if (fullName !== undefined && fullName !== null && typeof fullName !== 'string') {
      return apiErrorResponse('INVALID_FULL_NAME', 400, locale);
    }
    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      return apiErrorResponse('INVALID_PHONE', 400, locale);
    }

    const t = await getTranslations({ locale, namespace: 'auth.errors' });

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
    return internalServerErrorResponse(locale);
  }
}
