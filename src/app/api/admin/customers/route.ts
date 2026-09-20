import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { addMoney } from '@/lib/money';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/admin/customers
export async function GET() {
  try {
    await requireAdmin();
    const customers = await db.user.findMany({ where: { role: 'CUSTOMER' }, include: { orders: { select: { id: true, total: true, status: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ customers: customers.map((c) => ({ id: c.id, username: c.username, phone: c.phone, fullName: c.fullName, isActive: c.isActive, createdAt: c.createdAt, ordersCount: c.orders.length, totalSpent: c.orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => addMoney(s, o.total), 0) })) });
  } catch (e: unknown) { if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); } return internalServerErrorResponse(); }
}
