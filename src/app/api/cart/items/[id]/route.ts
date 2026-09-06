import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { safeJsonBody } from '@/lib/api-errors';

// PUT /api/cart/items/[id] - Update quantity
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await safeJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const payload = body as { quantity?: unknown };
    const quantity = payload.quantity;

    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await db.cartItem.findFirst({
      where: {
        id,
        cart: ownerWhere,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    const updated = await db.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return NextResponse.json({ item: updated, ok: true });
  } catch (error: unknown) {
    console.error('PUT /api/cart/items/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cart/items/[id] - Remove item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await db.cartItem.findFirst({
      where: {
        id,
        cart: ownerWhere,
      },
      select: { id: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await db.cartItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /api/cart/items/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
