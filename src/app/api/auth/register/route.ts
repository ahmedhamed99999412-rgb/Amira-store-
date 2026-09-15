import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, isValidEgyptianPhone, isValidUsername } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { getTranslations } from 'next-intl/server';
import { safeJsonBody, apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const limited = await rateLimit(req, 'auth:register', 5, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null || !body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const { username, phone, fullName, password, confirmPassword } = body as Record<string, unknown>;
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    if (typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: t('usernameRequired') }, { status: 400 });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: t('phoneRequired') }, { status: 400 });
    }
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: t('passwordRequired') }, { status: 400 });
    }

    const normalizedUsername = username.trim();
    const normalizedPhone = phone.trim();

    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json({ error: t('usernameRequired') }, { status: 400 });
    }
    if (!isValidEgyptianPhone(normalizedPhone)) {
      return NextResponse.json({ error: t('invalidPhone') }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: t('passwordTooShort') }, { status: 400 });
    }
    if (confirmPassword !== undefined && (typeof confirmPassword !== 'string' || password !== confirmPassword)) {
      return NextResponse.json({ error: t('passwordsDontMatch') }, { status: 400 });
    }

    const existingUsername = await db.user.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      return NextResponse.json({ error: t('usernameExists') }, { status: 409 });
    }

    const existingPhone = await db.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return NextResponse.json({ error: t('phoneExists') }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username: normalizedUsername,
        phone: normalizedPhone,
        fullName: typeof fullName === 'string' ? fullName.trim().slice(0, 120) || null : null,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, username: true, phone: true, fullName: true, role: true },
    });

    await setSessionCookie(user.id, user.role);
    return NextResponse.json({ user, ok: true });
  } catch (error: unknown) {
    console.error('Register error:', error);
    return internalServerErrorResponse(locale);
  }
}
