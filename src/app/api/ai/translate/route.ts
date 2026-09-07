import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, translateText } from '@/lib/ai';
import { requireAdmin } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { translateSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'ai:translate', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }
    await requireAdmin();
    const parsed = translateSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid translation request' }, { status: 400 });
    const { text, sourceLocale, targetLocale } = parsed.data;
    const translation = await translateText(text, sourceLocale, targetLocale);
    return NextResponse.json({ translation });
  } catch (error: unknown) {
    console.error('POST /api/ai/translate error:', error);
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (error instanceof AIProviderUnavailableError) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    return internalServerErrorResponse();
  }
}
