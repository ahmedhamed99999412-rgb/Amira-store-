import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Live search suggestions endpoint
// Returns: matching products (with image/price), categories, and keyword suggestions

const TRENDING_KEYWORDS_AR = [
  'فستان',
  'حذاء',
  'حقيبة',
  'عطر',
  'ملابس شتاء',
  'إكسسوارات',
];

const TRENDING_KEYWORDS_EN = [
  'Dress',
  'Shoes',
  'Bag',
  'Perfume',
  'Winter clothes',
  'Accessories',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const locale = searchParams.get('locale') === 'en' ? 'en' : 'ar';

    if (q.length > 120) {
      return NextResponse.json(
        { products: [], categories: [], keywords: [], trending: false, error: 'query_too_long' },
        { status: 400 }
      );
    }

    // Empty query -> return trending keywords only (shown when focused)
    if (q.length < 2) {
      return NextResponse.json({
        products: [],
        categories: [],
        keywords: locale === 'en' ? TRENDING_KEYWORDS_EN : TRENDING_KEYWORDS_AR,
        trending: true,
      });
    }

    // Run product + category searches in parallel
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [
            { slug: { contains: q } },
            { sku: { contains: q } },
            { translations: { some: { name: { contains: q } } } },
            { translations: { some: { shortDescription: { contains: q } } } },
            { tags: { some: { tag: { contains: q } } } },
          ],
        },
        include: {
          translations: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
          variants: { select: { stock: true } },
          category: { include: { translations: true } },
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      db.category.findMany({
        where: {
          isActive: true,
          translations: { some: { name: { contains: q } } },
        },
        include: {
          translations: true,
          image: true,
        },
        take: 4,
      }),
    ]);

    const formatPrice = (amount: number) =>
      locale === 'ar' ? `${new Intl.NumberFormat('ar-EG').format(amount)} ج.م` : `EGP ${amount}`;

    const mappedProducts = products.map((p) => {
      const tr = p.translations.find((t) => t.locale === locale) || p.translations[0];
      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
      const discount =
        p.comparePrice && p.comparePrice > p.price
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0;
      return {
        id: p.id,
        slug: p.slug,
        name: tr?.name || p.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        priceLabel: formatPrice(p.price),
        discount,
        inStock: totalStock > 0,
        image: p.images[0] ? `/api/images/${p.images[0].id}` : null,
        category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
      };
    });

    const mappedCategories = categories.map((c) => {
      const tr = c.translations.find((t) => t.locale === locale) || c.translations[0];
      return {
        id: c.id,
        slug: c.slug,
        name: tr?.name || c.slug,
        image: c.image ? `/api/images/${c.image.id}` : null,
      };
    });

    // Keyword suggestions derived from matched product names (unique short tokens)
    const keywordSet = new Set<string>();
    for (const p of mappedProducts) {
      const tokens = p.name.split(/\s+/).filter((t) => t.length >= 2 && t.includes(q));
      if (tokens.length > 0) keywordSet.add(tokens[0]);
      if (keywordSet.size >= 4) break;
    }
    // Always include the raw query as a keyword suggestion
    keywordSet.add(q);

    return NextResponse.json({
      products: mappedProducts,
      categories: mappedCategories,
      keywords: Array.from(keywordSet).slice(0, 5),
      trending: false,
    });
  } catch (err) {
    console.error('[search/suggest] error:', err);
    return NextResponse.json(
      { products: [], categories: [], keywords: [], trending: false, error: 'search_failed' },
      { status: 500 }
    );
  }
}
