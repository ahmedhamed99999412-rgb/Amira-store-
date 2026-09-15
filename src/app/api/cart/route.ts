import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse } from '@/lib/api-errors';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return NextResponse.json({ cart: { items: [] } });
    }

    const cart = await db.cart.findFirst({
      where: ownerWhere,
      select: {
        id: true,
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            quantity: true,
            product: {
              select: {
                slug: true,
                price: true,
                comparePrice: true,
                hasVariants: true,
                isActive: true,
                isDeleted: true,
                translations: { select: { locale: true, name: true } },
                images: { select: { id: true }, orderBy: { order: 'asc' }, take: 1 },
              },
            },
            variant: {
              select: {
                id: true, productId: true, size: true, color: true,
                regularPrice: true, salePrice: true, priceAdjustment: true, stock: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ cart: { items: [] } });
    }

    const staleItemIds = cart.items
      .filter((item) =>
        !item.product.isActive ||
        item.product.isDeleted ||
        (item.variantId !== null && (!item.variant || item.variant.productId !== item.productId)) ||
        (item.product.hasVariants && item.variantId === null)
      )
      .map((item) => item.id);

    const items = staleItemIds.length > 0
      ? cart.items.filter((item) => !staleItemIds.includes(item.id))
      : cart.items;

    return NextResponse.json({ cart: { id: cart.id, items } });
  } catch (error: unknown) {
    console.error('GET /api/cart error:', error);
    return internalServerErrorResponse();
  }
}
