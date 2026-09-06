import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // For API routes, pass through next-intl but inject locale via header
  if (pathname.startsWith('/api')) {
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
