import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { updateAddressSchema } from '@/lib/validation/address';

// PUT /api/user/addresses/[id] - Update address
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const body = await safeJsonBody(req);
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid address data' }, { status: 400 });
    }

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
    return internalServerErrorResponse();
  }
}

// DELETE /api/user/addresses/[id] - Delete address
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await db.address.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}
