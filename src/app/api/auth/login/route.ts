import { NextRequest, NextResponse } from 'next/server';
import { safeJsonBody } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { verifyPassword, isValidEgyptianPhone } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { getTranslations } from 'next-intl/server';
import { rateLimit } from '@/lib/rate-limit';
import { apiErrorResponse, getApiLocale } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const limited = await rateLimit(req, 'auth:login', 10, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null || !body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const { identifier, password } = body as Record<string, unknown>;
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: t('usernameRequired') }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: t('passwordRequired') }, { status: 400 });
    }

    const trimmed = identifier.trim();
    let user;
    if (isValidEgyptianPhone(trimmed)) {
      user = await db.user.findUnique({ where: { phone: trimmed } });
    } else {
      user = await db.user.findUnique({ where: { username: trimmed } });
    }

    if (!user) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });
    }

    await setSessionCookie(user.id, user.role);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
      },
      ok: true,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return apiErrorResponse('INTERNAL_SERVER_ERROR', 500, locale);
  }
}
