import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { internalServerErrorResponse } from '@/lib/api-errors';
import { ORDER_STATUSES } from '@/lib/order-status';

// GET /api/admin/orders
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status')?.trim() || undefined;
    const status = rawStatus && (ORDER_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : undefined;
    const q = searchParams.get('q') || undefined;
    const orders = await db.order.findMany({ where: { ...(status ? { status } : {}), ...(q ? { OR: [{ orderNumber: { contains: q } }, { guestName: { contains: q } }, { guestPhone: { contains: q } }] } : {}) }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, guestName: o.guestName, guestPhone: o.guestPhone, governorate: o.governorate, city: o.city, total: o.total, status: o.status, shippingStatus: o.shippingStatus, shippingCost: o.shippingCost, subtotal: o.subtotal, itemCount: o.items.length, createdAt: o.createdAt, userId: o.userId })) });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return internalServerErrorResponse();
  }
}
