import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/orders/track?orderNumber=X&phone=Y - Track an order
export async function GET(req: NextRequest) {
  try {
    const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
    const limited = await rateLimit(req, 'orders:track', 20, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!orderNumber || !phone) {
      return apiErrorResponse('TRACKING_REQUIRED', 400, locale);
    }

    if (orderNumber.length > 64 || phone.length > 32) {
      return apiErrorResponse('INVALID_TRACKING_PARAMETERS', 400, locale);
    }

    const order = await db.order.findFirst({
      where: {
        orderNumber,
        guestPhone: phone,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return apiErrorResponse('ORDER_NOT_FOUND', 404, locale);
    }

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        shippingStatus: order.shippingStatus,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        createdAt: order.createdAt,
        guestName: order.guestName,
        guestAddress: order.guestAddress,
        governorate: order.governorate,
        city: order.city,
        items: order.items.map((i) => ({
          productNameAr: i.productNameAr,
          productNameEn: i.productNameEn,
          productPrice: i.productPrice,
          quantity: i.quantity,
          productImage: i.productImage,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/orders/track error:', error);
    return internalServerErrorResponse(getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language')));
  }
}
