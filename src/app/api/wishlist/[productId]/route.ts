import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { isUniqueConstraintError } from '@/lib/prisma-errors';

async function getOrCreateWishlist() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  let guestId = cookieStore.get('guest_id')?.value;

  if (!guestId && !user) {
    guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let wishlist = await db.wishlist.findFirst({
    where: user ? { userId: user.id } : { guestId },
  });

  if (!wishlist) {
    try {
      wishlist = await db.wishlist.create({
        data: user ? { userId: user.id } : { guestId },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      wishlist = await db.wishlist.findFirst({
        where: user ? { userId: user.id } : { guestId },
      });
      if (!wishlist) throw error;
    }
  }

  return wishlist;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const locale = getApiLocale(_req.headers.get('x-locale'));

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
    });
    if (!product) {
      return apiErrorResponse('PRODUCT_NOT_FOUND', 404, locale);
    }

    const wishlist = await getOrCreateWishlist();
    const body = await safeJsonBody(_req);
    if (body !== null && (typeof body !== 'object' || Array.isArray(body))) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const action = body && typeof body === 'object' && !Array.isArray(body) && 'action' in body
      ? (body as { action?: unknown }).action
      : undefined;

    if (action !== undefined && action !== 'add' && action !== 'remove') {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    if (action === 'remove') {
      await db.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
      return NextResponse.json({ ok: true, action: 'removed' });
    }

    if (action === 'add') {
      try {
        await db.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
      return NextResponse.json({ ok: true, action: 'added' });
    }

    const existing = await db.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, action: 'removed' });
    }

    await db.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
    });

    return NextResponse.json({ ok: true, action: 'added' });
  } catch (error: unknown) {
    console.error('POST /api/wishlist/[productId] error:', error);
    return internalServerErrorResponse(getApiLocale(_req.headers.get('x-locale')));
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const wishlist = await getOrCreateWishlist();

    await db.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /api/wishlist/[productId] error:', error);
    return internalServerErrorResponse(getApiLocale(_req.headers.get('x-locale')));
  }
}
