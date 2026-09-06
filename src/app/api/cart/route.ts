import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse } from '@/lib/api-errors';
import { isUniqueConstraintError } from '@/lib/prisma-errors';

// Get or create cart for current user/guest
async function getOrCreateCart() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  let guestId = cookieStore.get('guest_id')?.value;

  if (!guestId && !user) {
    guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  let cart = await db.cart.findFirst({
    where: user ? { userId: user.id } : { guestId },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: true,
              images: { orderBy: { order: 'asc' } },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart) {
    try {
      cart = await db.cart.create({
        data: user ? { userId: user.id } : { guestId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  images: { orderBy: { order: 'asc' } },
                },
              },
              variant: true,
            },
          },
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      cart = await db.cart.findFirst({
        where: user ? { userId: user.id } : { guestId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  images: { orderBy: { order: 'asc' } },
                },
              },
              variant: true,
            },
          },
        },
      });
      if (!cart) throw error;
    }
  }

  return cart;
}

// GET /api/cart - Get current cart
export async function GET() {
  try {
    const cart = await getOrCreateCart();
    return NextResponse.json({ cart });
  } catch (error: unknown) {
    console.error('GET /api/cart error:', error);
    return internalServerErrorResponse();
  }
}
