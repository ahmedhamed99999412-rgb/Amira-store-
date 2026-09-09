import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from './lib/auth';

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // For API routes, pass through next-intl but inject locale via header
  if (pathname.startsWith('/api')) {
    const adminApiPath = pathname.startsWith('/api/admin/') || [
      '/api/ai/generate-description',
      '/api/ai/generate-sku',
      '/api/ai/suggest-variants',
      '/api/ai/translate',
    ].includes(pathname);
    if (adminApiPath) {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      const user = token ? verifyToken(token) : null;
      if (user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Extract locale from referer or default to ar
    const referer = req.headers.get('referer') || '';
    const localeMatch = referer.match(/\/(ar|en)(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : 'ar';
    const response = NextResponse.next({ request: req });
    response.headers.set('x-locale', locale);
    return response;
  }

  // For non-API routes, run next-intl middleware
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
