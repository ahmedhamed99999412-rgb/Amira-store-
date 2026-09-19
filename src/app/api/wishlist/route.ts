import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { internalServerErrorResponse } from '@/lib/api-errors';
import { getLowestVariantCardPricing, normalizeVariantPricing, productNeedsVariantSelection } from '@/lib/product-variants';

// GET is intentionally read-only. An empty wishlist should not create a database row
// on every page load; mutations are responsible for creating the wishlist when needed.
export async function GET(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ar';
    const user = await getCurrentUser();
    const guestId = (await cookies()).get('guest_id')?.value;
    const ownerWhere = user ? { userId: user.id } : guestId ? { guestId } : null;

    if (!ownerWhere) {
      return NextResponse.json({ items: [] });
    }

    const wishlist = await db.wishlist.findFirst({
      where: ownerWhere,
      select: {
        items: {
          select: {
            product: {
              select: {
                id: true,
                slug: true,
                sku: true,
                price: true,
                comparePrice: true,
                hasVariants: true,
                isActive: true,
                isDeleted: true,
                translations: { select: { locale: true, name: true, shortDescription: true } },
                images: { select: { id: true }, orderBy: { order: 'asc' }, take: 1 },
                variants: { select: { stock: true, regularPrice: true, salePrice: true, priceAdjustment: true, size: true, color: true } },
                reviews: { where: { isApproved: true }, select: { rating: true } },
                category: { select: { translations: { select: { locale: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    const items = (wishlist?.items || [])
      .map(({ product: p }) => {
        if (!p.isActive || p.isDeleted) return null;
        const pricing = getLowestVariantCardPricing(
          typeof p.price === 'number' ? p.price : Number(p.price),
          p.comparePrice != null ? (typeof p.comparePrice === 'number' ? p.comparePrice : Number(p.comparePrice)) : null,
          normalizeVariantPricing(p.variants)
        );
        // Every product has at least one placeholder variant row purely for
        // stock tracking, even "simple" products with no selectable
        // options — so `p.variants.length > 0` is true for literally every
        // product and can't be used to decide whether a picker is needed.
        // Whether a real size/color was set on at least one variant is the
        // only signal that matches what the listing pages and the cart API
        // use, so the wishlist card renders the same CTA as everywhere else.
        const hasSizeVariants = p.variants.some((v) => v.size != null);
        const hasColorVariants = p.variants.some((v) => v.color != null);
        return {
          id: p.id,
          productId: p.id,
          slug: p.slug,
          sku: p.sku,
          price: p.price,
          comparePrice: p.comparePrice,
          displayPrice: pricing.displayPrice,
          displayComparePrice: pricing.displayComparePrice,
          name:
            p.translations.find((t) => t.locale === locale)?.name ||
            p.translations.find((t) => t.locale === 'ar')?.name ||
            p.slug,
          shortDescription:
            p.translations.find((t) => t.locale === locale)?.shortDescription || '',
          category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
          image: p.images[0] ? `/api/images/${p.images[0].id}` : null,
          totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
          hasVariants: productNeedsVariantSelection(p.variants),
          hasSizeVariants,
          hasColorVariants,
          reviewCount: p.reviews.length,
          avgRating:
            p.reviews.length > 0
              ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
              : 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('GET /api/wishlist error:', error);
    return internalServerErrorResponse();
  }
}
