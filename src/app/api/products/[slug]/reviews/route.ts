import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';
import { reviewSubmissionSchema } from '@/lib/validation/review';

// POST /api/products/[slug]/reviews - Submit a product review
// Body: { name, rating (1-5), comment }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = rateLimit(req, 'reviews:create', 10, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many review submissions' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    const { slug } = await params;
    const body = await safeJsonBody(req);
    const parsed = reviewSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid review data' }, { status: 400 });
    }
    const { name, rating, comment } = parsed.data;

    // Find product by slug
    const product = await db.product.findUnique({ where: { slug } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get current user (optional - guests can review)
    const user = await getCurrentUser();

    // Create review (auto-approved)
    const review = await db.review.create({
      data: {
        productId: product.id,
        userId: user?.id || null,
        guestName: name.trim(),
        guestPhone: user?.phone || null,
        rating: Math.round(rating),
        comment: comment.trim(),
        isApproved: true,
      },
    });

    return NextResponse.json({ review, ok: true });
  } catch (error: unknown) {
    console.error('POST review error:', error);
    return internalServerErrorResponse();
  }
}
