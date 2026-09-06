import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { createAddressSchema } from '@/lib/validation/address';

// GET /api/user/addresses - List user's addresses
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}

// POST /api/user/addresses - Create new address
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await safeJsonBody(req);
    const parsed = createAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid address data' }, { status: 400 });
    }

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
    return internalServerErrorResponse();
  }
}
