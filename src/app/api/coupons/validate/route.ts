import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { clampMoney, percentageMoney, roundMoney } from '@/lib/money';
import { rateLimit } from '@/lib/rate-limit';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

const couponValidationSchema = z.object({
  code: z.string().trim().min(1).max(100),
  subtotal: z.number().finite().min(0).max(10_000_000).refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-8, 'Invalid monetary amount'),
});

// POST /api/coupons/validate
// Validates a coupon code and returns the discount amount.
// This endpoint is preview-only; coupon usage is consumed during order creation.
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'coupons:validate', 30, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many coupon validation attempts' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    const parsed = couponValidationSchema.safeParse(await safeJsonBody(req));

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid coupon validation request' }, { status: 400 });
    }

    const { code, subtotal } = parsed.data;

    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Coupon not found or inactive' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ error: 'Coupon expired' }, { status: 400 });
    }

    if (coupon.minOrder && subtotal < coupon.minOrder) {
      return NextResponse.json({
        error: `Minimum order amount is ${coupon.minOrder} EGP`,
      }, { status: 400 });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    const rawDiscount =
      coupon.type === 'PERCENTAGE'
        ? percentageMoney(subtotal, coupon.value)
        : roundMoney(coupon.value);

    const discount = clampMoney(rawDiscount, 0, subtotal);

    return NextResponse.json({
      valid: true,
      discount,
      type: coupon.type,
      value: coupon.value,
    });
  } catch (error: unknown) {
    console.error('POST /api/coupons/validate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
