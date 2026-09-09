'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, Package } from 'lucide-react';
import { useEffect, useState, Suspense, use } from 'react';

function SuccessContent({ locale }: { locale: string }) {
  const t = useTranslations('order');
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');
  const whatsappUrl = searchParams.get('whatsapp');
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (whatsappUrl && !redirected) {
      const timer = setTimeout(() => {
        window.location.assign(whatsappUrl);
        setRedirected(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [whatsappUrl, redirected]);

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl font-medium text-brand-charcoal mb-3">
        {t('success')}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
        {t('successDesc')}
      </p>

      {orderNumber && (
        <div className="inline-block bg-brand-cream border border-brand-mauve/30 rounded-lg px-6 py-4 mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {t('orderNumber')}
          </p>
          <p className="font-mono text-lg font-bold text-brand-charcoal" dir="ltr">
            {orderNumber}
          </p>
        </div>
      )}

      {whatsappUrl && (
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3">
            {locale === 'ar' ? 'يتم تحويلك لواتساب تلقائياً...' : 'Redirecting to WhatsApp...'}
          </p>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white rounded-none h-12 px-8">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5 me-2" />
              {locale === 'ar' ? 'فتح واتساب' : 'Open WhatsApp'}
            </a>
          </Button>
          {!redirected && (
            <p className="text-xs text-muted-foreground mt-2 animate-pulse">
              {locale === 'ar' ? 'سيتم فتح واتساب خلال لحظات...' : 'WhatsApp will open in a moment...'}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/track-order">
            <Package className="h-4 w-4 me-2" />
            {t('trackOrder')}
          </Link>
        </Button>
        <Button asChild className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
          <Link href="/shop">
            {locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function SuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <SuccessContent locale={locale} />
    </Suspense>
  );
}
