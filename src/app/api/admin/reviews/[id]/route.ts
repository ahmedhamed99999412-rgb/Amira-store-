import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// PATCH /api/admin/reviews/[id] - Approve or hide a review
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await safeJsonBody(req);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiErrorResponse('INVALID_REQUEST_BODY', 400, locale);
    }

    const isApproved = (body as { isApproved?: unknown }).isApproved;
    if (typeof isApproved !== 'boolean') {
      return apiErrorResponse('INVALID_MODERATION_STATUS', 400, locale);
    }

    const review = await db.review.updateMany({
      where: { id },
      data: { isApproved },
    });

    if (review.count !== 1) {
      return apiErrorResponse('REVIEW_NOT_FOUND', 404, locale);
    }

    return NextResponse.json({ ok: true, isApproved });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return apiErrorResponse('FORBIDDEN', 403, locale);
    }
    console.error('PATCH /api/admin/reviews/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}

// DELETE /api/admin/reviews/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    await requireAdmin();
    const { id } = await params;
    const review = await db.review.deleteMany({ where: { id } });

    if (review.count !== 1) {
      return apiErrorResponse('REVIEW_NOT_FOUND', 404, locale);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return apiErrorResponse('FORBIDDEN', 403, locale);
    }
    console.error('DELETE /api/admin/reviews/[id] error:', error);
    return internalServerErrorResponse(locale);
  }
}
