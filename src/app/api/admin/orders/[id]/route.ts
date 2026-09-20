import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/admin/orders/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const order = await db.order.findUnique({ where: { id }, include: { items: true, user: { select: { id: true, username: true, fullName: true, phone: true } } } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e: unknown) { if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); } return internalServerErrorResponse(); }
}
