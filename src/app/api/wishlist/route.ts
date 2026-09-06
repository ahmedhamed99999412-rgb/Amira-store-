import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { internalServerErrorResponse } from '@/lib/api-errors';
import { isUniqueConstraintError } from '@/lib/prisma-errors';

async function getOrCreateWishlist() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  let guestId = cookieStore.get('guest_id')?.value;

  if (!guestId && !user) {
    guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let wishlist = await db.wishlist.findFirst({
    where: user ? { userId: user.id } : { guestId },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: true,
              images: { orderBy: { order: 'asc' } },
              variants: true,
              reviews: { where: { isApproved: true } },
              category: { include: { translations: true } },
            },
          },
        },
      },
    },
  });

  if (!wishlist) {
    try {
      wishlist = await db.wishlist.create({
        data: user ? { userId: user.id } : { guestId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  images: { orderBy: { order: 'asc' } },
                  variants: true,
                  reviews: { where: { isApproved: true } },
                  category: { include: { translations: true } },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      wishlist = await db.wishlist.findFirst({
        where: user ? { userId: user.id } : { guestId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  images: { orderBy: { order: 'asc' } },
                  variants: true,
                  reviews: { where: { isApproved: true } },
                  category: { include: { translations: true } },
                },
              },
            },
          },
        },
      });
      if (!wishlist) throw error;
    }
  }

  return wishlist;
}

// GET /api/wishlist - Get wishlist items
export async function GET(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ar';
    const wishlist = await getOrCreateWishlist();

    const items = wishlist.items.map((item) => {
      const p = item.product;
      return {
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice,
        name: p.translations.find((t) => t.locale === locale)?.name || p.translations.find((t) => t.locale === 'ar')?.name || p.slug,
        shortDescription: p.translations.find((t) => t.locale === locale)?.shortDescription || '',
        category: p.category?.translations.find((t) => t.locale === locale)?.name || '',
        image: p.images[0] ? `/api/images/${p.images[0].id}` : null,
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
        reviewCount: p.reviews.length,
        avgRating: p.reviews.length > 0 ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length : 0,
      };
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('GET /api/wishlist error:', error);
    return internalServerErrorResponse();
  }
}
