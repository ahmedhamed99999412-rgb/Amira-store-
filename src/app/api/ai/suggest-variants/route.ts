import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, suggestVariants } from '@/lib/ai';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { suggestVariantsSchema } from '@/lib/validation/ai';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    await requireAdmin();

    const limited = await rateLimit(req, 'ai:variants', 20, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const parsed = suggestVariantsSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return apiErrorResponse('INVALID_AI_REQUEST', 400, locale);

    const { productName, category, locale: outputLocale } = parsed.data;
    const result = await suggestVariants(productName, category, outputLocale);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('POST /api/ai/suggest-variants error:', error);
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return apiErrorResponse('FORBIDDEN', 403, locale);
    }
    if (error instanceof AIProviderUnavailableError) {
      return apiErrorResponse('AI_PROVIDER_UNAVAILABLE', 503, locale);
    }
    return internalServerErrorResponse(locale);
  }
}
