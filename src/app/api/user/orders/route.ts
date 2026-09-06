import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/user/orders - Get current user's orders
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await db.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        shippingStatus: o.shippingStatus,
        subtotal: o.subtotal,
        shippingCost: o.shippingCost,
        total: o.total,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          productNameAr: i.productNameAr,
          productNameEn: i.productNameEn,
          productPrice: i.productPrice,
          quantity: i.quantity,
          productImage: i.productImage,
        })),
      })),
    });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}
