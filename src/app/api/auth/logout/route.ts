import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';
import { internalServerErrorResponse } from '@/lib/api-errors';

// POST /api/auth/logout
// Clears the session cookie
export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}
