import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/products/[slug] - Get single product by slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const locale = req.headers.get('x-locale') || 'ar';
    const product = await getProductBySlug(slug, locale);

    if (!product) {
      return apiErrorResponse('PRODUCT_NOT_FOUND', 404, getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language')));
    }

    const related = await getRelatedProducts(product.id, locale, 6);

    return NextResponse.json({ product, related });
  } catch (error: unknown) {
    console.error('GET /api/products/[slug] error:', error);
    return internalServerErrorResponse(getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language')));
  }
}
