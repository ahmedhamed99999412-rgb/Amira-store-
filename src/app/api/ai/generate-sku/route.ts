import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, generateSKU } from '@/lib/ai';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { generateSkuSchema } from '@/lib/validation/ai';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    await requireAdmin();

    const limited = await rateLimit(req, 'ai:sku', 20, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const parsed = generateSkuSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return apiErrorResponse('INVALID_AI_REQUEST', 400, locale);

    const { nameAr, nameEn, excludeId } = parsed.data;
    if (!nameAr && !nameEn) {
      return apiErrorResponse('INVALID_AI_REQUEST', 400, locale);
    }

    let sku = '';
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < 3) {
      sku = await generateSKU(nameAr || '', nameEn || '');
      const existing = await db.product.findUnique({ where: { sku }, select: { id: true } });
      if (!existing || existing.id === excludeId) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      const base = sku.replace(/\d+$/, '') || 'AMS-PRD';
      let counter = 1;
      while (counter <= 10_000) {
        const candidate = `${base}${String(counter).padStart(2, '0')}`;
        const existing = await db.product.findUnique({ where: { sku: candidate }, select: { id: true } });
        if (!existing || existing.id === excludeId) {
          sku = candidate;
          isUnique = true;
          break;
        }
        counter++;
      }
    }

    if (!isUnique) {
      return internalServerErrorResponse(locale);
    }

    return NextResponse.json({ sku });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return apiErrorResponse('FORBIDDEN', 403, locale);
    }
    if (error instanceof AIProviderUnavailableError) {
      return apiErrorResponse('AI_PROVIDER_UNAVAILABLE', 503, locale);
    }
    console.error('POST /api/ai/generate-sku error:', error);
    return internalServerErrorResponse(locale);
  }
}
