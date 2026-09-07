import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, generateSKU } from '@/lib/ai';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { generateSkuSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// POST /api/ai/generate-sku
// Generates a unique SKU for a product based on its name, ensuring uniqueness in DB
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'ai:sku', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }
    await requireAdmin();
    const parsed = generateSkuSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid AI request' }, { status: 400 });
    const { nameAr, nameEn, excludeId } = parsed.data;

    if (!nameAr && !nameEn) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Try to generate a unique SKU (retry up to 3 times if collision)
    let sku = '';
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < 3) {
      sku = await generateSKU(nameAr || '', nameEn || '');
      const existing = await db.product.findUnique({
        where: { sku },
        select: { id: true },
      });
      // If SKU exists but it's the same product being edited, that's fine
      if (!existing || existing.id === excludeId) {
        isUnique = true;
      }
      attempts++;
    }

    // Fallback: if AI failed to generate unique, append a number
    if (!isUnique) {
      const base = sku.replace(/\d+$/, '') || 'AMS-PRD';
      let counter = 1;
      let candidate = `${base}${String(counter).padStart(2, '0')}`;
      while (true) {
        const existing = await db.product.findUnique({
          where: { sku: candidate },
          select: { id: true },
        });
        if (!existing || existing.id === excludeId) break;
        counter++;
        candidate = `${base}${String(counter).padStart(2, '0')}`;
      }
      sku = candidate;
    }

    return NextResponse.json({ sku });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof AIProviderUnavailableError) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    console.error('POST /api/ai/generate-sku error:', error);
    return internalServerErrorResponse();
  }
}
