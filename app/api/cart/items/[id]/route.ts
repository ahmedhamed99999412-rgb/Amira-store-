import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

const MAX_CART_QUANTITY = 100;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const { id } = await params;
    const body = await safeJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const payload = body as { quantity?: unknown };
    const quantity = payload.quantity;
    if (
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_CART_QUANTITY
    ) {
      return apiErrorResponse('INVALID_QUANTITY', 400, locale);
    }

    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return apiErrorResponse('UNAUTHORIZED', 401, locale);
    }

    const item = await db.cartItem.findFirst({
      where: { id, cart: ownerWhere },
      include: { product: { include: { variants: true } }, variant: true },
    });

    if (!item) {
      return apiErrorResponse('CART_ITEM_NOT_FOUND', 404, locale);
    }

    if (!item.product.isActive || item.product.isDeleted) {
      return apiErrorResponse('PRODUCT_NOT_FOUND', 404, locale);
    }

    const hasSizeOptions = item.product.variants.some((candidate) => Boolean(candidate.size?.trim()));
    const hasColorOptions = item.product.variants.some((candidate) => Boolean(candidate.color?.trim()));
    const variantMode: 'none' | 'size' | 'color' | 'both' = hasSizeOptions && hasColorOptions
      ? 'both'
      : hasSizeOptions
        ? 'size'
        : hasColorOptions
          ? 'color'
          : 'none';

    if (variantMode !== 'none' && (!item.variant || item.variant.productId !== item.productId)) {
      await db.cartItem.delete({ where: { id: item.id } });
      return apiErrorResponse('CART_ITEM_NOT_FOUND', 404, locale);
    }

    if (item.variant) {
      const hasSize = Boolean(item.variant.size?.trim());
      const hasColor = Boolean(item.variant.color?.trim());
      const validForMode =
        (variantMode === 'size' && hasSize && !hasColor) ||
        (variantMode === 'color' && hasColor && !hasSize) ||
        (variantMode === 'both' && hasSize && hasColor) ||
        variantMode === 'none';
      if (!validForMode) {
        await db.cartItem.delete({ where: { id: item.id } });
        return apiErrorResponse('CART_ITEM_NOT_FOUND', 404, locale);
      }
    }

    const availableStock = item.variant
      ? item.variant.stock
      : item.product.variants.reduce((sum, productVariant) => sum + productVariant.stock, 0);

    if (quantity > availableStock) {
      return apiErrorResponse('INSUFFICIENT_STOCK', 400, locale);
    }

    const updated = await db.cartItem.updateMany({
      where: { id: item.id, cart: ownerWhere },
      data: { quantity },
    });

    if (updated.count !== 1) {
      return apiErrorResponse('CART_ITEM_NOT_FOUND', 404, locale);
    }

    const saved = await db.cartItem.findUnique({ where: { id: item.id } });
    if (!saved) {
      return internalServerErrorResponse(locale);
    }

    return NextResponse.json({ item: saved, ok: true });
  } catch (error: unknown) {
    console.error('PUT /api/cart/items/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return apiErrorResponse('UNAUTHORIZED', 401, locale);
    }

    const item = await db.cartItem.findFirst({ where: { id, cart: ownerWhere }, select: { id: true } });
    if (!item) {
      return apiErrorResponse('CART_ITEM_NOT_FOUND', 404, locale);
    }

    await db.cartItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /api/cart/items/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}
