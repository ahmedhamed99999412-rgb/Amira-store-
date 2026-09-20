import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export const revalidate = 60;

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, categories] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
  ]);

  const storeName = locale === 'ar' ? settings.storeNameAr : settings.storeNameEn;
  const announcement = locale === 'ar' ? settings.announcementAr : settings.announcementEn;
  const isAr = locale === 'ar';

  const whatsappDigits = settings.whatsappNumber.trim().replace(/\D/g, '');
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith('0') ? `20${whatsappDigits.slice(1)}` : whatsappDigits}` : null;

  return (
    <>
      <Header categories={categories} locale={locale} storeName={storeName} announcement={announcement} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">
            {isAr ? 'الشحن والتوصيل' : 'Shipping & Delivery'}
          </h1>

          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                {isAr
                  ? 'يتم تأكيد تكلفة الشحن وموعد التوصيل بعد مراجعة عنوان الطلب والتواصل مع العميل. لا يتم احتساب أو وعد بتكلفة أو مدة توصيل ثابتة من خلال هذه الصفحة.'
                  : 'Shipping cost and delivery timing are confirmed after reviewing the order address and contacting the customer. This page does not promise a fixed shipping cost or delivery time.'}
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'كيف يتم تأكيد الشحن؟' : 'How shipping is confirmed'}
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {isAr ? (
                  <>
                    <li>أكمل بيانات الطلب والعنوان بشكل صحيح.</li>
                    <li>بعد استلام الطلب، يتم التواصل معك لتأكيد العنوان وتكلفة الشحن.</li>
                    <li>بعد التأكيد، يتم تجهيز الطلب للتسليم.</li>
                  </>
                ) : (
                  <>
                    <li>Complete your order and address details accurately.</li>
                    <li>After the order is received, we contact you to confirm the address and shipping cost.</li>
                    <li>Once confirmed, the order is prepared for delivery.</li>
                  </>
                )}
              </ol>
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'الاستفسارات' : 'Questions'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'للاستفسار عن منطقة التوصيل أو حالة طلبك أو تكلفة الشحن، تواصل معنا مباشرة قبل تأكيد الطلب.'
                  : 'For questions about delivery areas, your order, or shipping cost, contact us directly before confirming the order.'}
              </p>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-4 text-sm font-medium text-brand-charcoal underline underline-offset-4"
                >
                  {isAr ? 'التواصل عبر واتساب' : 'Contact via WhatsApp'}
                </a>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
