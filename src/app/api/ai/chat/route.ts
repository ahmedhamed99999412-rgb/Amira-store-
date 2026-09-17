import { NextRequest, NextResponse } from 'next/server';
import { AIProviderUnavailableError, chatWithAssistant } from '@/lib/ai';
import { getStoreSettings } from '@/lib/queries';
import { rateLimit } from '@/lib/rate-limit';
import { chatSchema } from '@/lib/validation/ai';
import { apiErrorResponse, getApiLocale, internalServerErrorResponse, safeJsonBody } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const locale = getApiLocale(req.headers.get('x-locale') || req.headers.get('accept-language'));

  try {
    const limited = await rateLimit(req, 'ai:chat', 20, 10 * 60_000);
    if (!limited.ok) {
      return apiErrorResponse('TOO_MANY_REQUESTS', 429, locale, undefined, { 'Retry-After': String(limited.retryAfterSeconds) });
    }

    const parsed = chatSchema.safeParse(await safeJsonBody(req));
    if (!parsed.success) return apiErrorResponse('INVALID_AI_REQUEST', 400, locale);

    const { message, history } = parsed.data;
    const settings = await getStoreSettings();
    const response = await chatWithAssistant(
      message,
      history || [],
      locale,
      {
        name: locale === 'ar' ? settings.storeNameAr : settings.storeNameEn,
        whatsapp: settings.whatsappNumber,
      }
    );

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('POST /api/ai/chat error:', error);
    if (error instanceof AIProviderUnavailableError) {
      return apiErrorResponse('AI_PROVIDER_UNAVAILABLE', 503, locale);
    }
    return internalServerErrorResponse(locale);
  }
}
