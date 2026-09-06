import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { generateOrderMessage, generateOrderNumber, buildWhatsAppUrl } from '@/lib/whatsapp';
import { getStoreSettings } from '@/lib/queries';
import { createOrderSchema } from '@/lib/validation/order';
import { addMoney, clampMoney, multiplyMoney, percentageMoney, roundMoney, subtractMoney } from '@/lib/money';
import { safeJsonBody } from '@/lib/api-errors';

// POST /api/orders - Create a new order and generate WhatsApp message
export async function POST(req: NextRequest) {
  let parsedGuestPhoneForRetry: string | undefined;

  try {
    const body = await safeJsonBody(req);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const locale = req.headers.get('x-locale') || 'ar';
    const idempotencyKey = req.headers.get('Idempotency-Key')?.trim() || null;
    if (idempotencyKey && (idempotencyKey.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) {
      return NextResponse.json({ error: 'Invalid idempotency key' }, { status: 400 });
    }

    const {
      items,
      guestName,
      guestPhone,
      guestAddress,
      governorate,
      city,
      landmarks,
      guestNotes,
      couponCode: submittedCouponCode,
    } = parsed.data;
    parsedGuestPhoneForRetry = guestPhone.trim();

    // Get current user (optional - guest checkout supported)
    const user = await getCurrentUser();
    const settings = await getStoreSettings();

    // Fast path for safe client retries. The unique DB constraint remains the
    // final guard for concurrent requests using the same key.
    if (idempotencyKey) {
      const existingOrder = await db.order.findUnique({
        where: { idempotencyKey },
        include: { items: true },
      });

      if (existingOrder) {
        const sameOwner = user
          ? existingOrder.userId === user.id
          : existingOrder.userId === null && existingOrder.guestPhone === guestPhone.trim();

        if (!sameOwner) {
          return NextResponse.json({ error: 'Unable to reuse this checkout request' }, { status: 409 });
        }

        const whatsappMessage = await generateOrderMessage(
          {
            orderNumber: existingOrder.orderNumber,
            guestName: existingOrder.guestName,
            guestPhone: existingOrder.guestPhone,
            guestAddress: existingOrder.guestAddress,
            governorate: existingOrder.governorate,
            city: existingOrder.city,
            landmarks: existingOrder.landmarks,
            guestNotes: existingOrder.guestNotes,
            subtotal: existingOrder.subtotal,
            shippingCost: existingOrder.shippingCost,
            shippingStatus: existingOrder.shippingStatus,
            total: existingOrder.total,
            items: existingOrder.items.map((i) => ({
              productNameAr: i.productNameAr,
              productNameEn: i.productNameEn,
              productPrice: i.productPrice,
              quantity: i.quantity,
            })),
          },
          locale
        );

        return NextResponse.json({
          ok: true,
          order: {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            total: existingOrder.total,
            subtotal: existingOrder.subtotal,
            shippingStatus: existingOrder.shippingStatus,
          },
          whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage),
          message: whatsappMessage,
          idempotent: true,
        });
      }
    }

    // Perform pricing, coupon consumption, stock reservation, and order creation
    // inside a single transaction. This prevents partial writes and overselling.
    const transactionResult = await db.$transaction(async (tx) => {
      const orderItemsData: Array<{
        productId: string;
        variantId: string | null;
        productNameAr: string;
        productNameEn: string;
        productSku: string;
        productPrice: number;
        quantity: number;
        productImage: string;
        stockAllocation: string;
      }> = [];

      let subtotal = 0;

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, isActive: true, isDeleted: false },
          include: {
            translations: true,
            images: { orderBy: { order: 'asc' } },
            variants: true,
          },
        });

        if (!product) {
          throw new OrderValidationError('PRODUCT_NOT_FOUND', `Product not found: ${item.productId}`);
        }

        let variant: (typeof product.variants)[number] | null = null;
        if (item.variantId) {
          variant = product.variants.find((v) => v.id === item.variantId) ?? null;
          if (!variant) {
            throw new OrderValidationError('VARIANT_NOT_FOUND', 'Variant not found');
          }
        }

        const price = product.price + (variant?.priceAdjustment || 0);
        subtotal = addMoney(subtotal, multiplyMoney(price, item.quantity));

        const nameAr = product.translations.find((t) => t.locale === 'ar')?.name || product.slug;
        const nameEn = product.translations.find((t) => t.locale === 'en')?.name || product.slug;
        const primaryImage = product.images[0];
        const variantInfo = variant
          ? ` (${[variant.size, variant.color].filter(Boolean).join(' / ')})`
          : '';

        // Reserve stock atomically and record the exact variant allocation so a later
        // cancellation can restore the same stock without guessing.
        const stockAllocation: Array<{ variantId: string; quantity: number }> = [];

        if (variant) {
          const updated = await tx.productVariant.updateMany({
            where: { id: variant.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });

          if (updated.count !== 1) {
            throw new OrderValidationError('INSUFFICIENT_STOCK', `Insufficient stock for ${product.slug}`);
          }

          stockAllocation.push({ variantId: variant.id, quantity: item.quantity });
        } else {
          let remaining = item.quantity;
          const variants = [...product.variants].sort((a, b) => a.id.localeCompare(b.id));

          for (const v of variants) {
            if (remaining <= 0) break;
            if (v.stock <= 0) continue;

            const desired = Math.min(v.stock, remaining);
            const updated = await tx.productVariant.updateMany({
              where: { id: v.id, stock: { gte: desired } },
              data: { stock: { decrement: desired } },
            });

            if (updated.count === 1) {
              remaining -= desired;
              stockAllocation.push({ variantId: v.id, quantity: desired });
            }
          }

          if (remaining > 0) {
            throw new OrderValidationError('INSUFFICIENT_STOCK', `Insufficient stock for ${product.slug}`);
          }
        }

        orderItemsData.push({
          productId: product.id,
          variantId: variant?.id || null,
          productNameAr: nameAr + variantInfo,
          productNameEn: nameEn + variantInfo,
          productSku: product.sku,
          productPrice: price,
          quantity: item.quantity,
          productImage: primaryImage ? `/api/images/${primaryImage.id}` : '',
          stockAllocation: JSON.stringify(stockAllocation),
        });
      }

      const shippingStatus = determineShippingStatus(settings, subtotal);
      const shippingCost = shippingStatus === 'FREE' ? 0 : null;

      let discount = 0;
      const couponCode = submittedCouponCode || null;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode.trim() } });
        if (!coupon || !coupon.isActive) {
          throw new OrderValidationError('COUPON_INVALID', 'Coupon not found or inactive');
        }
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
          throw new OrderValidationError('COUPON_EXPIRED', 'Coupon expired');
        }
        if (coupon.minOrder !== null && subtotal < coupon.minOrder) {
          throw new OrderValidationError('COUPON_MIN_ORDER', `Coupon requires minimum order of ${coupon.minOrder}`);
        }
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new OrderValidationError('COUPON_LIMIT', 'Coupon usage limit reached');
        }

        const rawDiscount = coupon.type === 'PERCENTAGE'
          ? percentageMoney(subtotal, coupon.value)
          : roundMoney(coupon.value);
        discount = clampMoney(rawDiscount, 0, subtotal);

        const usageUpdate = coupon.usageLimit === null
          ? await tx.coupon.updateMany({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            })
          : await tx.coupon.updateMany({
              where: {
                id: coupon.id,
                usedCount: { lt: coupon.usageLimit },
                isActive: true,
              },
              data: { usedCount: { increment: 1 } },
            });

        if (usageUpdate.count !== 1) {
          throw new OrderValidationError('COUPON_LIMIT', 'Coupon usage limit reached');
        }
      }

      const total = addMoney(subtractMoney(subtotal, discount), shippingCost || 0);

      // Generate a unique order number. The unique DB constraint remains the final guard.
      let orderNumber = generateOrderNumber();
      let existing = await tx.order.findUnique({ where: { orderNumber } });
      while (existing) {
        orderNumber = generateOrderNumber();
        existing = await tx.order.findUnique({ where: { orderNumber } });
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey,
          userId: user?.id || null,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestAddress: guestAddress.trim(),
          governorate: governorate.trim(),
          city: city.trim(),
          landmarks: landmarks?.trim() || null,
          guestNotes: guestNotes?.trim() || null,
          subtotal,
          shippingCost,
          shippingStatus,
          discount,
          couponCode,
          total,
          status: 'PENDING_CONFIRMATION',
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      return { order };
    });

    const order = transactionResult.order;
    // Generate WhatsApp message
    const whatsappMessage = await generateOrderMessage(
      {
        orderNumber: order.orderNumber,
        guestName: order.guestName,
        guestPhone: order.guestPhone,
        guestAddress: order.guestAddress,
        governorate: order.governorate,
        city: order.city,
        landmarks: order.landmarks,
        guestNotes: order.guestNotes,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        shippingStatus: order.shippingStatus,
        total: order.total,
        items: order.items.map((i) => ({
          productNameAr: i.productNameAr,
          productNameEn: i.productNameEn,
          productPrice: i.productPrice,
          quantity: i.quantity,
        })),
      },
      locale
    );

    const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage);

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        shippingStatus: order.shippingStatus,
      },
      whatsappUrl,
      message: whatsappMessage,
    });
  } catch (error: unknown) {
    if (error instanceof OrderValidationError) {
      const status = error.code === 'PRODUCT_NOT_FOUND' || error.code === 'VARIANT_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    // A concurrent retry can lose the unique idempotency-key race after its
    // transaction has already been rolled back. Return the already-created
    // order instead of creating a duplicate.
    if (isPrismaIdempotencyConflict(error)) {
      const idempotencyKey = req.headers.get('Idempotency-Key')?.trim();
      if (idempotencyKey) {
        const existingOrder = await db.order.findUnique({
          where: { idempotencyKey },
          include: { items: true },
        });

        if (existingOrder) {
          const user = await getCurrentUser();
          const sameOwner = user
            ? existingOrder.userId === user.id
            : existingOrder.userId === null && existingOrder.guestPhone === parsedGuestPhoneForRetry;

          if (sameOwner) {
            const settings = await getStoreSettings();
            const locale = req.headers.get('x-locale') || 'ar';
            const whatsappMessage = await generateOrderMessage(
              {
                orderNumber: existingOrder.orderNumber,
                guestName: existingOrder.guestName,
                guestPhone: existingOrder.guestPhone,
                guestAddress: existingOrder.guestAddress,
                governorate: existingOrder.governorate,
                city: existingOrder.city,
                landmarks: existingOrder.landmarks,
                guestNotes: existingOrder.guestNotes,
                subtotal: existingOrder.subtotal,
                shippingCost: existingOrder.shippingCost,
                shippingStatus: existingOrder.shippingStatus,
                total: existingOrder.total,
                items: existingOrder.items.map((i) => ({
                  productNameAr: i.productNameAr,
                  productNameEn: i.productNameEn,
                  productPrice: i.productPrice,
                  quantity: i.quantity,
                })),
              },
              locale
            );

            return NextResponse.json({
              ok: true,
              order: {
                id: existingOrder.id,
                orderNumber: existingOrder.orderNumber,
                total: existingOrder.total,
                subtotal: existingOrder.subtotal,
                shippingStatus: existingOrder.shippingStatus,
              },
              whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage),
              message: whatsappMessage,
              idempotent: true,
            });
          }
        }
      }
    }

    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

class OrderValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

function determineShippingStatus(settings: any, subtotal: number): 'FREE' | 'MANUAL' {
  if (!settings.freeShippingEnabled) return 'MANUAL';

  const now = new Date();
  if (settings.freeShippingStart && now < settings.freeShippingStart) return 'MANUAL';
  if (settings.freeShippingEnd && now > settings.freeShippingEnd) return 'MANUAL';

  if (settings.freeShippingMinOrder && subtotal < settings.freeShippingMinOrder) return 'MANUAL';

  return 'FREE';
}


function isPrismaIdempotencyConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== 'P2002') return false;

  const target = candidate.meta?.target;
  return Array.isArray(target)
    ? target.includes('idempotencyKey')
    : target === 'idempotencyKey';
}
