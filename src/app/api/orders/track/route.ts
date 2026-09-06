import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/orders/track?orderNumber=X&phone=Y - Track an order
export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'orders:track', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many tracking attempts' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'orderNumber and phone are required' }, { status: 400 });
    }

    if (orderNumber.length > 64 || phone.length > 32) {
      return NextResponse.json({ error: 'Invalid tracking parameters' }, { status: 400 });
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
    return internalServerErrorResponse();
  }
}
