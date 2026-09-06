import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { internalServerErrorResponse } from '@/lib/api-errors';

// GET /api/images/[id] - Serve a single image from DB as binary
// This prevents loading all base64 images into the page HTML (reduces memory drastically)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try product image first
    const productImage = await db.productImage.findUnique({ where: { id } });
    if (productImage) {
      const buffer = Buffer.from(productImage.base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': productImage.mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Try category image
    const categoryImage = await db.categoryImage.findUnique({ where: { id } });
    if (categoryImage) {
      const buffer = Buffer.from(categoryImage.base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': categoryImage.mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Try banner by id
    const banner = await db.banner.findUnique({ where: { id } });
    if (banner) {
      const buffer = Buffer.from(banner.base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': banner.mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (error: unknown) {
    return internalServerErrorResponse();
  }
}
