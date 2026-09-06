import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/auth/me
// Returns the current authenticated user, or null if not logged in
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}
