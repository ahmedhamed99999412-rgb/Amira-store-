import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/images/[id] - Serve a single image from DB as binary.
// Image IDs are table-local, so we preserve the existing URL contract and
// resolve the ID with one parameterized SQL round trip instead of three
// separate Prisma queries per image request.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await db.$queryRaw<Array<{ base64Data: string; mimeType: string }>>`
      SELECT "base64Data", "mimeType" FROM "product_images" WHERE "id" = ${id}
      UNION ALL
      SELECT "base64Data", "mimeType" FROM "category_images" WHERE "id" = ${id}
      UNION ALL
      SELECT "base64Data", "mimeType" FROM "banners" WHERE "id" = ${id}
      LIMIT 1
    `;

    const image = rows[0];
    if (image) {
      const buffer = Buffer.from(image.base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': image.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'CDN-Cache-Control': 'public, max-age=31536000, immutable',
          'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          'Content-Length': String(buffer.length),
        },
      });
    }

    return apiErrorResponse(
      'IMAGE_NOT_FOUND',
      404,
      getApiLocale(_req.headers.get('x-locale') || _req.headers.get('accept-language'))
    );
  } catch (error: unknown) {
    console.error('GET /api/images/[id] error:', error);
    return internalServerErrorResponse(
      getApiLocale(_req.headers.get('x-locale') || _req.headers.get('accept-language'))
    );
  }
}
