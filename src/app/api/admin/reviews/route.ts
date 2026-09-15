import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/admin/reviews
export async function GET(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.trim() || 'pending';
    const where =
      status === 'approved'
        ? { isApproved: true }
        : status === 'all'
          ? {}
          : { isApproved: false };

    const reviews = await db.review.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            translations: { select: { locale: true, name: true } },
          },
        },
        user: { select: { id: true, username: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        productSlug: review.product.slug,
        productNameAr: review.product.translations.find((t) => t.locale === 'ar')?.name || review.product.slug,
        productNameEn: review.product.translations.find((t) => t.locale === 'en')?.name || review.product.slug,
        userId: review.userId,
        username: review.user?.username || null,
        userPhone: review.user?.phone || review.guestPhone || null,
        guestName: review.guestName,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isApproved: review.isApproved,
        createdAt: review.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return apiErrorResponse('FORBIDDEN', 403, locale);
    }
    console.error('GET /api/admin/reviews error:', error);
    return internalServerErrorResponse(locale);
  }
}
