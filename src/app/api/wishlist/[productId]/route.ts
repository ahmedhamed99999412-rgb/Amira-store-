import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { wishlistActionSchema } from '@/lib/validation/wishlist';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';
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

function resolveAction(body: unknown): 'add' | 'remove' | undefined {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const action = (body as { action?: unknown }).action;
    if (action === 'add' || action === 'remove') return action;
  }
  return undefined;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const locale = getApiLocale(req.headers.get('x-locale'));

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
    });
    if (!product) {
      return apiErrorResponse('PRODUCT_NOT_FOUND', 404, locale);
    }

    const body = await req.json().catch(() => null);

    let action: 'add' | 'remove' | undefined;

    if (body !== null) {
      const parsed = wishlistActionSchema.safeParse(body);
      if (parsed.success) {
        action = parsed.data.action;
      } else {
        action = resolveAction(body);
      }
    }

    if (action === undefined) {
      action = 'add';
    }

    const wishlist = await getOrCreateWishlist();

    if (action === 'remove') {
      await db.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
      return NextResponse.json({ ok: true, action: 'removed' });
    }

    try {
      await db.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    return NextResponse.json({ ok: true, action: 'added' });
  } catch (error: unknown) {
    console.error('POST /api/wishlist/[productId] error:', error);
    return internalServerErrorResponse(getApiLocale(req.headers.get('x-locale')));
  }
}

export async function DELETE(
  req: NextRequest,
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
    return internalServerErrorResponse(getApiLocale(req.headers.get('x-locale')));
  }
}
