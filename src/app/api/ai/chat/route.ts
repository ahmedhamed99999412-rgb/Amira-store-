import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, chatWithAssistant } from '@/lib/ai';
import { getStoreSettings } from '@/lib/queries';
import { rateLimit } from '@/lib/rate-limit';
import { chatSchema } from '@/lib/validation/ai';
import { internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'ai:chat', 20, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } });
    }

    const parsed = chatSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid AI request' }, { status: 400 });
    const { message, history } = parsed.data;
    const locale = req.headers.get('x-locale') === 'en' ? 'en' : 'ar';
    const settings = await getStoreSettings();
    const response = await chatWithAssistant(message, history || [], locale, { name: locale === 'ar' ? settings.storeNameAr : settings.storeNameEn, whatsapp: settings.whatsappNumber, freeShipping: settings.freeShippingEnabled });
    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('POST /api/ai/chat error:', error);
    if (error instanceof AIProviderUnavailableError) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }
    return internalServerErrorResponse();
  }
}
