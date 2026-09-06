import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// PUT /api/auth/change-password
// Changes the password for the current user
// Body: { currentPassword, newPassword, confirmPassword }
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
    const { currentPassword, newPassword, confirmPassword } = body as Record<string, unknown>;

    const locale = req.headers.get('x-locale') || 'ar';
    const t = await getTranslations({ locale, namespace: 'auth.errors' });

    // Validate required fields
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json({ error: t('passwordRequired') }, { status: 400 });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json({ error: t('passwordTooShort') }, { status: 400 });
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: t('passwordsDontMatch') }, { status: 400 });
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: t('invalidCredentials') }, { status: 401 });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    return internalServerErrorResponse();
  }
}
