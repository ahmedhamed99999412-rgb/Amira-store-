import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/queries';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/products - List products with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = req.headers.get('x-locale') || 'ar';
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '12');
    if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
    }
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: 'Invalid pageSize' }, { status: 400 });
    }
    const q = searchParams.get('q') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const rawMinPrice = searchParams.get('minPrice');
    const rawMaxPrice = searchParams.get('maxPrice');
    const minPrice = rawMinPrice !== null && rawMinPrice !== '' ? Number(rawMinPrice) : undefined;
    const maxPrice = rawMaxPrice !== null && rawMaxPrice !== '' ? Number(rawMaxPrice) : undefined;
    if ((minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
        (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
        (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) {
      return NextResponse.json({ error: 'Invalid price range' }, { status: 400 });
    }
    const rawSort = searchParams.get('sort') || 'newest';
    const sort = ['newest', 'price-asc', 'price-desc', 'rating'].includes(rawSort)
      ? (rawSort as 'newest' | 'price-asc' | 'price-desc' | 'rating')
      : null;
    if (!sort) {
      return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });
    }
    const onSale = searchParams.get('sale') === 'true';
    const featured = searchParams.get('featured') === 'true';

    const result = await getAllProducts(locale, {
      page, pageSize, q, categoryId, minPrice, maxPrice, sort, onSale, featured,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('GET /api/products error:', error);
    return internalServerErrorResponse();
  }
}
