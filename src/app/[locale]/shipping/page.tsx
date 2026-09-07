import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

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

  const deliveryInfo = isAr
    ? [
        { title: 'التوصيل داخل القاهرة', desc: 'توصيل خلال 1-2 أيام عمل' },
        { title: 'التوصيل للمحافظات الأخرى', desc: 'توصيل خلال 2-4 أيام عمل' },
        { title: 'التوصيل الدولي', desc: 'متوفر لبعض البلدان - يرجى الاستعلام' },
      ]
    : [
        { title: 'Cairo & Giza', desc: 'Delivery within 1-2 business days' },
        { title: 'Other Governorates', desc: 'Delivery within 2-4 business days' },
        { title: 'International Shipping', desc: 'Available for select countries - please inquire' },
      ];

  const costInfo = isAr
    ? [
        { title: 'تكلفة الشحن', desc: 'يتم تحديدها بعد تأكيد العنوان' },
      ]
    : [
        { title: 'Calculated Shipping', desc: 'Determined after address confirmation' },
      ];

  return (
    <>
      <Header categories={categories} locale={locale} storeName={storeName} announcement={announcement} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">
            {isAr ? 'الشحن والتوصيل' : 'Shipping & Delivery'}
          </h1>

          <div className="prose prose-sm max-w-3xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              {isAr
                ? 'نحن في أميرا ستور نحرص على توصيل طلباتكم بأسرع وقت ممكن وبأفضل جودة. نستخدم شركات شحن موثوقة لضمان وصول بضاعتكم إليكم بأمان.'
                : 'At Amira Store, we strive to deliver your orders as quickly as possible with the best quality. We use reliable shipping companies to ensure your products arrive safely.'}
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'مناطق التوصيل' : 'Delivery Areas'}
              </h2>
              <ul className="space-y-3">
                {deliveryInfo.map((item, idx) => (
                  <li key={idx} className="border-b border-border pb-2">
                    <span className="font-medium text-sm text-brand-charcoal">{item.title}</span>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'تكلفة الشحن' : 'Shipping Cost'}
              </h2>
              <ul className="space-y-3">
                {costInfo.map((item, idx) => (
                  <li key={idx} className="border-b border-border pb-2">
                    <span className="font-medium text-sm text-brand-charcoal">{item.title}</span>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
              {isAr ? 'كيف يتم شحن طلبي؟' : 'How is my order shipped?'}
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {isAr ? (
                <>
                  <li>بعد تأكيد الطلب، يتم تحضيره من قبل فريقنا.</li>
                  <li>يتم التواصل معك عبر واتساب أو هاتف لتحديد تكلفة الشحن.</li>
                  <li>يتم إرسال طلبك عبر شركة شحن موثوقة.</li>
                  <li>تتواصل معنا إذا احتجت أي تعديل على العنوان أو التسليم.</li>
                </>
              ) : (
                <>
                  <li>After your order is confirmed, our team prepares it.</li>
                  <li>We contact you via WhatsApp or phone to confirm shipping cost.</li>
                  <li>Your order is shipped via a reliable courier service.</li>
                  <li>Contact us if you need to make changes to the address or delivery.</li>
                </>
              )}
            </ol>
          </div>
        </div>
      </main>
      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
