import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { internalServerErrorResponse, safeJsonBody, apiErrorResponse, getApiLocale } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function PUT(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const limited = await rateLimit(req, 'auth:change-password', 5, 10 * 60_000, user.id);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null || !body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const { currentPassword, newPassword, confirmPassword } = body as Record<string, unknown>;
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json({ error: t('passwordRequired') }, { status: 400 });
    }
    if (newPassword.length < 6) return NextResponse.json({ error: t('passwordTooShort') }, { status: 400 });
    if (newPassword !== confirmPassword) return NextResponse.json({ error: t('passwordsDontMatch') }, { status: 400 });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });

    const passwordHash = await hashPassword(newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    return internalServerErrorResponse(locale);
  }
}
