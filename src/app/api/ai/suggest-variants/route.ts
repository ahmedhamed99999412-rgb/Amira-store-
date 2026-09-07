import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, suggestVariants } from '@/lib/ai';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { suggestVariantsSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

// POST /api/ai/suggest-variants
// Suggests variant options (sizes/colors) based on product type
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'ai:variants', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }
    await requireAdmin();
    const parsed = suggestVariantsSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid AI request' }, { status: 400 });
    const { productName, category, locale } = parsed.data;
    const result = await suggestVariants(productName, category, locale);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (e instanceof AIProviderUnavailableError) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    return internalServerErrorResponse();
  }
}
