import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse } from '@/lib/api-errors';
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

// POST /api/wishlist/[productId] - Toggle wishlist item (add if not present, remove if present)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const wishlist = await getOrCreateWishlist();

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
    return internalServerErrorResponse();
  }
}

// DELETE /api/wishlist/[productId] - Remove from wishlist
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
    return internalServerErrorResponse();
  }
}
