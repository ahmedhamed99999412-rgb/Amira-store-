import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, generateDescription } from '@/lib/ai';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { generateDescriptionSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'ai:description', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }
    await requireAdmin();
    const parsed = generateDescriptionSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid AI request' }, { status: 400 });
    const { productName, category, features, locale } = parsed.data;
    const desc = await generateDescription(productName, category, features, locale);
    return NextResponse.json({ description: desc });
  } catch (error: unknown) {
    console.error('POST /api/ai/generate-description error:', error);
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (error instanceof AIProviderUnavailableError) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    return internalServerErrorResponse();
  }
}
