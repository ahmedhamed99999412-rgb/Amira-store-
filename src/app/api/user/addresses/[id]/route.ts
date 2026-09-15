import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { updateAddressSchema } from '@/lib/validation/address';
import { rateLimit } from '@/lib/rate-limit';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const limited = await rateLimit(req, 'addresses:update', 30, 10 * 60_000, user.id);
    if (!limited.ok) return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });

    const existing = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) return apiErrorResponse('ADDRESS_NOT_FOUND', 404, locale);

    const parsed = updateAddressSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return apiErrorResponse('INVALID_ADDRESS_DATA', 400, locale);

    const { fullName, phone, street, city, governorate, landmarks, isDefault } = parsed.data;

    const address = await db.$transaction(async (tx) => {
      if (isDefault === true && !existing.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          fullName: fullName ?? existing.fullName,
          phone: phone ?? existing.phone,
          street: street ?? existing.street,
          city: city ?? existing.city,
          governorate: governorate ?? existing.governorate,
          landmarks: landmarks !== undefined ? (landmarks || null) : existing.landmarks,
          isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        },
      });
    });

    return NextResponse.json({ address, ok: true });
  } catch (error: unknown) {
    console.error('PUT /api/user/addresses/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return apiErrorResponse('UNAUTHORIZED', 401, locale);

    const limited = await rateLimit(req, 'addresses:delete', 30, 10 * 60_000, user.id);
    if (!limited.ok) return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });

    const existing = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) return apiErrorResponse('ADDRESS_NOT_FOUND', 404, locale);

    await db.address.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('DELETE /api/user/addresses/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}
