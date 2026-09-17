import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { createAddressSchema } from '@/lib/validation/address';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch {
    return internalServerErrorResponse(locale);
  }
}

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const limited = await rateLimit(req, 'addresses:create', 20, 10 * 60_000, user.id);
    if (!limited.ok) return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });

    const parsed = createAddressSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return apiErrorResponse('INVALID_ADDRESS_DATA', 400, locale);

    const { fullName, phone, street, city, governorate, landmarks, isDefault } = parsed.data;

    const address = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId: user.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          governorate: governorate.trim(),
          landmarks: landmarks?.trim() || null,
          isDefault,
        },
      });
    });

    return NextResponse.json({ address, ok: true });
  } catch (error: unknown) {
    console.error('POST /api/user/addresses error:', error);
    return internalServerErrorResponse(locale);
  }
}
