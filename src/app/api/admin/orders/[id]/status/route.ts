import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { canTransitionOrderStatus } from '@/lib/order-status';
import { updateOrderStatusSchema } from '@/lib/validation/admin-order';
import { parseStockAllocation } from '@/lib/order-stock';
import { addMoney, subtractMoney, roundMoney } from '@/lib/money';
import { safeJsonBody } from '@/lib/api-errors';

// PUT /api/admin/orders/[id]/status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await safeJsonBody(req);
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid order update data' }, { status: 400 });
    }

    const { status, shippingCost } = parsed.data;
    const existingOrder = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        subtotal: true,
        discount: true,
        shippingCost: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (status !== undefined && !canTransitionOrderStatus(existingOrder.status, status)) {
      return NextResponse.json({
        error: `Invalid order status transition: ${existingOrder.status} -> ${status}`,
        code: 'INVALID_STATUS_TRANSITION',
      }, { status: 409 });
    }

    const updateData: {
      status?: string;
      shippingCost?: number | null;
      total?: number;
    } = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (shippingCost !== undefined) {
      const normalizedShippingCost = shippingCost === null ? null : roundMoney(shippingCost);
      updateData.shippingCost = normalizedShippingCost;

      // Preserve the order's existing discount when recalculating the total.
      // The admin may change shipping independently; that must never silently
      // remove a coupon/order discount.
      updateData.total = addMoney(
        subtractMoney(existingOrder.subtotal, existingOrder.discount),
        normalizedShippingCost ?? 0,
      );
    }

    if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      const order = await db.$transaction(async (tx) => {
        const orderForCancellation = await tx.order.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            couponCode: true,
            items: {
              select: {
                id: true,
                variantId: true,
                quantity: true,
                stockAllocation: true,
              },
            },
          },
        });

        if (!orderForCancellation) {
          throw new OrderStatusUpdateError('ORDER_NOT_FOUND', 'Not found');
        }

        if (orderForCancellation.status === 'CANCELLED') {
          throw new OrderStatusUpdateError('ALREADY_CANCELLED', 'Order already cancelled');
        }

        if (!canTransitionOrderStatus(orderForCancellation.status, 'CANCELLED')) {
          throw new OrderStatusUpdateError(
            'INVALID_STATUS_TRANSITION',
            `Invalid order status transition: ${orderForCancellation.status} -> CANCELLED`
          );
        }

        const allocationsToRestore: Array<{ variantId: string; quantity: number }> = [];
        for (const item of orderForCancellation.items) {
          const allocation = parseStockAllocation(item.stockAllocation);
          if (allocation) {
            allocationsToRestore.push(...allocation);
            continue;
          }

          // Legacy orders created before stockAllocation was introduced can only
          // be restored safely when the order line has an explicit variant.
          if (item.variantId) {
            allocationsToRestore.push({ variantId: item.variantId, quantity: item.quantity });
            continue;
          }

          // The previous implementation could spread a variant-less quantity
          // across several variants. That allocation is not reconstructable from
          // historical data, so never guess and corrupt inventory.
          throw new OrderStatusUpdateError(
            'STOCK_RECONCILIATION_REQUIRED',
            'This legacy order cannot be cancelled automatically because its original stock allocation is unavailable.'
          );
        }

        // Atomically claim the cancellation. A concurrent cancellation/status
        // update will cause this conditional update to affect zero rows.
        const claimed = await tx.order.updateMany({
          where: { id, status: orderForCancellation.status },
          data: { status: 'CANCELLED' },
        });
        if (claimed.count !== 1) {
          throw new OrderStatusUpdateError('CONCURRENT_UPDATE', 'Order was updated by another request');
        }

        for (const allocation of allocationsToRestore) {
          const restored = await tx.productVariant.updateMany({
            where: { id: allocation.variantId },
            data: { stock: { increment: allocation.quantity } },
          });

          if (restored.count !== 1) {
            throw new OrderStatusUpdateError(
              'VARIANT_NOT_FOUND',
              `Unable to restore stock for variant ${allocation.variantId}`
            );
          }
        }

        // Reverse the coupon usage consumed by this order, if applicable.
        // The conditional decrement makes repeated/concurrent cancellations safe.
        if (orderForCancellation.couponCode) {
          await tx.coupon.updateMany({
            where: {
              code: orderForCancellation.couponCode,
              usedCount: { gt: 0 },
            },
            data: { usedCount: { decrement: 1 } },
          });
        }

        return tx.order.findUnique({
          where: { id },
          include: { items: true },
        });
      });

      if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ order, ok: true });
    }

    const order = await db.order.update({ where: { id }, data: updateData });
    return NextResponse.json({ order, ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof OrderStatusUpdateError) {
      const statusCode =
        error.code === 'ORDER_NOT_FOUND' || error.code === 'VARIANT_NOT_FOUND' ? 404 :
        error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'CONCURRENT_UPDATE' ? 409 :
        error.code === 'STOCK_RECONCILIATION_REQUIRED' ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

class OrderStatusUpdateError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'OrderStatusUpdateError';
  }
}
