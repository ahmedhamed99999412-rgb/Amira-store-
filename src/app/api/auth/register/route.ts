import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, isValidEgyptianPhone, isValidUsername } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { getTranslations } from 'next-intl/server';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// POST /api/auth/register
// Creates a new customer account
// Body: { username, phone, fullName?, password, confirmPassword? }
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await safeJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { username, phone, fullName, password, confirmPassword } = body as Record<string, unknown>;

    // Get locale from header (set by middleware) for localized error messages
    const locale = req.headers.get('x-locale') || 'ar';
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    // Validate required fields
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

    // Validate username format (3-30 alphanumeric + underscore)
    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json({ error: t('usernameRequired') }, { status: 400 });
    }

    // Validate Egyptian phone (11 digits, starts with 01[0125])
    if (!isValidEgyptianPhone(normalizedPhone)) {
      return NextResponse.json({ error: t('invalidPhone') }, { status: 400 });
    }

    // Validate password length (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json({ error: t('passwordTooShort') }, { status: 400 });
    }

    // Check password confirmation if provided
    if (confirmPassword !== undefined && (typeof confirmPassword !== 'string' || password !== confirmPassword)) {
      return NextResponse.json({ error: t('passwordsDontMatch') }, { status: 400 });
    }

    // Check if username already exists
    const existingUsername = await db.user.findUnique({ where: { username: normalizedUsername } });
    if (existingUsername) {
      return NextResponse.json({ error: t('usernameExists') }, { status: 409 });
    }

    // Check if phone already exists
    const existingPhone = await db.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return NextResponse.json({ error: t('phoneExists') }, { status: 409 });
    }

    // Create user with hashed password
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

    // Set session cookie (auto-login after register)
    await setSessionCookie(user.id, user.role);

    return NextResponse.json({ user, ok: true });
  } catch (error: unknown) {
    console.error('Register error:', error);
    return internalServerErrorResponse();
  }
}
