import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse, safeJsonBody, apiErrorResponse, getApiLocale } from '@/lib/api-errors';
import { isUniqueConstraintError } from '@/lib/prisma-errors';

const MAX_CART_QUANTITY = 100;

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

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const body = await safeJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const payload = body as { productId?: unknown; variantId?: unknown; quantity?: unknown };
    const productId = payload.productId;
    const variantId = payload.variantId;
    const quantity = payload.quantity === undefined ? 1 : payload.quantity;

    if (typeof productId !== 'string' || productId.length === 0) {
      return apiErrorResponse('PRODUCT_ID_REQUIRED', 400, locale);
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_CART_QUANTITY
    ) {
      return apiErrorResponse('INVALID_QUANTITY', 400, locale);
    }

    if (variantId !== undefined && variantId !== null && typeof variantId !== 'string') {
      return apiErrorResponse('INVALID_VARIANT_ID', 400, locale);
    }

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
      include: { variants: true },
    });

    if (!product) {
      return apiErrorResponse('PRODUCT_NOT_FOUND', 404, locale);
    }

    const hasSizeOptions = product.variants.some((candidate) => Boolean(candidate.size?.trim()));
    const hasColorOptions = product.variants.some((candidate) => Boolean(candidate.color?.trim()));
    const variantMode: 'none' | 'size' | 'color' | 'both' = hasSizeOptions && hasColorOptions
      ? 'both'
      : hasSizeOptions
        ? 'size'
        : hasColorOptions
          ? 'color'
          : 'none';

    if (variantMode !== 'none' && !variantId) {
      return apiErrorResponse('VARIANT_REQUIRED', 400, locale);
    }

    let variant: (typeof product.variants)[number] | null = null;
    if (variantId) {
      variant = await db.productVariant.findFirst({ where: { id: variantId, productId } });
      if (!variant) {
        return apiErrorResponse('VARIANT_NOT_FOUND', 404, locale);
      }

      const hasSize = Boolean(variant.size?.trim());
      const hasColor = Boolean(variant.color?.trim());
      const validForMode =
        (variantMode === 'size' && hasSize && !hasColor) ||
        (variantMode === 'color' && hasColor && !hasSize) ||
        (variantMode === 'both' && hasSize && hasColor) ||
        (variantMode === 'none');

      if (!validForMode) {
        return apiErrorResponse('INVALID_VARIANT_ID', 400, locale);
      }

      if (variant.stock < quantity) {
        return apiErrorResponse('INSUFFICIENT_STOCK', 400, locale);
      }
    } else {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock < quantity) {
        return apiErrorResponse('INSUFFICIENT_STOCK', 400, locale);
      }
    }

    const cart = await getOrCreateCart();
    const normalizedVariantId = variantId || null;

    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: normalizedVariantId },
    });

    const availableStock = variant
      ? variant.stock
      : product.variants.reduce((sum, productVariant) => sum + productVariant.stock, 0);

    if (existing) {
      const updated = await db.cartItem.updateMany({
        where: {
          id: existing.id,
          quantity: {
            lte: Math.min(MAX_CART_QUANTITY, availableStock) - quantity,
          },
        },
        data: { quantity: { increment: quantity } },
      });

      if (updated.count !== 1) {
        if (existing.quantity + quantity > MAX_CART_QUANTITY) {
          return apiErrorResponse('INVALID_QUANTITY', 400, locale);
        }
        return apiErrorResponse('INSUFFICIENT_STOCK', 400, locale);
      }

      const item = await db.cartItem.findUnique({ where: { id: existing.id } });
      if (!item) {
        return internalServerErrorResponse(locale);
      }

      return NextResponse.json({ item, ok: true });
    }

    try {
      const item = await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: normalizedVariantId,
          quantity,
        },
      });

      return NextResponse.json({ item, ok: true });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const existingAfterRace = await db.cartItem.findFirst({
        where: { cartId: cart.id, productId, variantId: normalizedVariantId },
      });

      if (!existingAfterRace) throw error;

      const updated = await db.cartItem.updateMany({
        where: {
          id: existingAfterRace.id,
          quantity: {
            lte: Math.min(MAX_CART_QUANTITY, availableStock) - quantity,
          },
        },
        data: { quantity: { increment: quantity } },
      });

      if (updated.count !== 1) {
        if (existingAfterRace.quantity + quantity > MAX_CART_QUANTITY) {
          return apiErrorResponse('INVALID_QUANTITY', 400, locale);
        }
        return apiErrorResponse('INSUFFICIENT_STOCK', 400, locale);
      }

      const item = await db.cartItem.findUnique({ where: { id: existingAfterRace.id } });
      if (!item) {
        return internalServerErrorResponse(locale);
      }

      return NextResponse.json({ item, ok: true });
    }
  } catch (error: unknown) {
    console.error('POST /api/cart/items error:', error);
    return internalServerErrorResponse(locale);
  }
}
