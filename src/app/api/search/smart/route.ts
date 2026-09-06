import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { smartSearch } from '@/lib/ai';
import { smartSearchSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const parsed = smartSearchSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
    const { query } = parsed.data;
    const locale = req.headers.get('x-locale') === 'en' ? 'en' : 'ar';

    const analysis = await smartSearch(query, locale);
    const keywords = analysis.keywords || [query];
    const where: { isActive: true; isDeleted: false; OR: Array<Record<string, unknown>>; categoryId?: { in: string[] } } = { isActive: true, isDeleted: false, OR: [] };
    for (const kw of keywords) {
      where.OR.push({ translations: { some: { name: { contains: kw } } } });
      where.OR.push({ translations: { some: { description: { contains: kw } } } });
      where.OR.push({ tags: { some: { tag: { contains: kw } } } });
    }

    if (analysis.category) {
      const category = await db.category.findFirst({ where: { OR: [{ slug: analysis.category }, { translations: { some: { name: { contains: analysis.category } } } }] }, include: { children: { select: { id: true } } } });
      if (category) {
        const ids = new Set([category.id, ...category.children.map((c) => c.id)]);
        const stack = [...category.children.map((c) => c.id)];
        while (stack.length) { const id = stack.pop()!; const ch = await db.category.findMany({ where: { parentId: id }, select: { id: true } }); for (const c of ch) { ids.add(c.id); stack.push(c.id); } }
        where.categoryId = { in: [...ids] };
      }
    }

    const products = await db.product.findMany({ where, include: { translations: true, images: { orderBy: { order: 'asc' }, take: 1 }, variants: true, reviews: { where: { isApproved: true } }, category: { include: { translations: true } } }, take: 20 });
    return NextResponse.json({ analysis, products: products.map((p) => ({ id: p.id, slug: p.slug, price: p.price, comparePrice: p.comparePrice, name: p.translations.find((t) => t.locale === locale)?.name || p.translations.find((t) => t.locale === 'ar')?.name || p.slug, category: p.category?.translations.find((t) => t.locale === locale)?.name || '', image: p.images[0] ? `/api/images/${p.images[0].id}` : null, totalStock: p.variants.reduce((s, v) => s + v.stock, 0), reviewCount: p.reviews.length, avgRating: p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0 })) });
  } catch (error: unknown) {
    console.error('POST /api/search/smart error:', error);
    return internalServerErrorResponse();
  }
}
