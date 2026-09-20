'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');
  const locale = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div dir={dir} lang={locale} className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-muted-foreground/30" />
      <h1 className="font-serif text-3xl font-medium text-brand-charcoal mt-4">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{t('description')}</p>
      <div className="flex items-center gap-3 mt-6">
        <Button onClick={() => reset()} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
          {t('retry')}
        </Button>
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/">{locale === 'ar' ? 'الصفحة الرئيسية' : 'Home'}</Link>
        </Button>
      </div>
    </div>
  );
}
