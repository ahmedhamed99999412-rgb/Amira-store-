import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { isUniqueConstraintError } from '@/lib/prisma-errors';

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
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let cart = await db.cart.findFirst({
    where: user ? { userId: user.id } : { guestId },
  });

  if (!cart) {
    try {
      cart = await db.cart.create({
        data: user ? { userId: user.id } : { guestId },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      cart = await db.cart.findFirst({
        where: user ? { userId: user.id } : { guestId },
      });
      if (!cart) throw error;
    }
  }

  return cart;
}

// POST /api/cart/items - Add item to cart
export async function POST(req: NextRequest) {
  try {
    const body = await safeJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const payload = body as { productId?: unknown; variantId?: unknown; quantity?: unknown };
    const productId = payload.productId;
    const variantId = payload.variantId;
    const quantity = payload.quantity === undefined ? 1 : payload.quantity;

    if (typeof productId !== 'string' || productId.length === 0) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    if (variantId !== undefined && variantId !== null && typeof variantId !== 'string') {
      return NextResponse.json({ error: 'Invalid variantId' }, { status: 400 });
    }

    // Verify product exists and is active
    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
      include: { variants: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify variant if provided
    let variant: (typeof product.variants)[number] | null = null;
    if (variantId) {
      variant = await db.productVariant.findFirst({
        where: { id: variantId, productId },
      });
      if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
      }
      if (variant.stock < quantity) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
      }
    } else {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock < quantity) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
      }
    }

    const cart = await getOrCreateCart();

    // Check if item already in cart
    const existing = await db.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existing) {
      const updated = await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
      return NextResponse.json({ item: updated, ok: true });
    }

    const item = await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity,
      },
    });

    return NextResponse.json({ item, ok: true });
  } catch (error: unknown) {
    console.error('POST /api/cart/items error:', error);
    return internalServerErrorResponse();
  }
}
