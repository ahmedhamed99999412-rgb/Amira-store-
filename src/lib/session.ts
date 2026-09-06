import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { createToken, verifyToken, COOKIE_NAME } from '@/lib/auth';
import type { User } from '@prisma/client';

// Get the current authenticated user from the session cookie
// Returns null if not logged in or session is invalid
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

// Require authentication - throws 'UNAUTHORIZED' if not logged in
// Use in API routes that require a logged-in user
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

// Require admin role - throws 'UNAUTHORIZED' or 'FORBIDDEN'
// Use in API routes that require admin access
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

// Set session cookie after successful login/register
// Cookie is httpOnly (secure against XSS), 7-day expiry
export async function setSessionCookie(userId: string, role: string): Promise<void> {
  const token = createToken({ userId, role });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
}

// Clear session cookie on logout
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
