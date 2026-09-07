import type { Metadata } from 'next';
import { Inter, Playfair_Display, Tajawal, Amiri } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ChatWidget } from '@/components/ai/ChatWidget';
import { ServerStateSync } from '@/components/store/ServerStateSync';
import '../globals.css';

// English fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-en',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif-en',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Arabic fonts
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  variable: '--font-sans-ar',
  display: 'swap',
  weight: ['300', '400', '500', '700', '800'],
});

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  variable: '--font-serif-ar',
  display: 'swap',
  weight: ['400', '700'],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: {
      default:
        locale === 'ar'
          ? 'أميرا ستور | متجر الأناقة العصرية'
          : 'Amira Store | Modern Elegance',
      template:
        locale === 'ar' ? '%s | أميرا ستور' : '%s | Amira Store',
    },
    description:
      locale === 'ar'
        ? 'متجر أميرا ستور - وجهتك الأولى للتسوق الأنيق في مصر. أزياء، عطور، ومستحضرات تجميل أصلية بأفضل الأسعار.'
        : 'Amira Store - your premier destination for elegant shopping in Egypt. Fashion, fragrances, and beauty products at the best prices.',
    keywords:
      locale === 'ar'
        ? ['متجر', 'أزياء', 'عطور', 'مكياج', 'مصر', 'تسوق', 'أميرا']
        : ['store', 'fashion', 'perfume', 'makeup', 'Egypt', 'shopping', 'amira'],
    authors: [{ name: 'Amira Store' }],
    openGraph: {
      title: locale === 'ar' ? 'أميرا ستور' : 'Amira Store',
      description:
        locale === 'ar'
          ? 'متجر الأناقة العصرية في مصر'
          : 'Modern Elegance in Egypt',
      type: 'website',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
    icons: {
      icon: '/logo.svg',
      shortcut: '/logo.svg',
      apple: '/logo.svg',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const lang = locale;

  return (
    <div
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${tajawal.variable} ${amiri.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      style={{
        fontFamily:
          locale === 'ar'
            ? 'var(--font-sans-ar), system-ui, sans-serif'
            : 'var(--font-sans-en), system-ui, sans-serif',
      }}
    >
      <NextIntlClientProvider>
        <AuthProvider>
          <ServerStateSync locale={locale} />
          {children}
          <CartDrawer locale={locale} />
          <ChatWidget locale={locale} />
        </AuthProvider>
      </NextIntlClientProvider>
      <Toaster position={locale === 'ar' ? 'bottom-left' : 'bottom-right'} />
    </div>
  );
}
