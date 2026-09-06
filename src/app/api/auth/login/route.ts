import { NextRequest, NextResponse } from 'next/server';
import { safeJsonBody } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { verifyPassword, isValidEgyptianPhone } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { getTranslations } from 'next-intl/server';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/auth/login
// Login with username OR phone + password
// Body: { identifier, password }
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'auth:login', 10, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many login attempts' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    const body: unknown = await safeJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { identifier, password } = body as Record<string, unknown>;

    const locale = req.headers.get('x-locale') || 'ar';
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: t('usernameRequired') }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: t('passwordRequired') }, { status: 400 });
    }

    // Find user by username OR phone
    // If the identifier matches Egyptian phone format, search by phone
    // Otherwise search by username
    const trimmed = identifier.trim();
    let user;
    if (isValidEgyptianPhone(trimmed)) {
      user = await db.user.findUnique({ where: { phone: trimmed } });
    } else {
      user = await db.user.findUnique({ where: { username: trimmed } });
    }

    // User not found
    if (!user) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });
    }

    // Account deactivated
    if (!user.isActive) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 403 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });
    }

    // Set session cookie
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
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
