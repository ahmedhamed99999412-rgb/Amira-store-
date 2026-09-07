import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ReturnsPage({
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

  return (
    <>
      <Header categories={categories} locale={locale} storeName={storeName} announcement={announcement} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">
            {isAr ? 'سياسة الإرجاع والاستبدال' : 'Returns & Exchanges'}
          </h1>

          <div className="prose prose-sm max-w-3xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              {isAr
                ? 'للاستفسار عن الإرجاع أو الاستبدال، يرجى التواصل مع خدمة العملاء قبل إرسال المنتج.'
                : 'For return or exchange questions, please contact customer service before sending the product.'}
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'شروط الإرجاع' : 'Return Conditions'}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {isAr ? (
                  <>
                    <li>يجب أن يكون المنتج في حالة أصلية غير مستخدمة.</li>
                    <li>يجب أن يكون المنتج مع عبوته الأصلية والهياكل والملصقات.</li>
                    <li>لا يمكن إرجاع المنتجات التي تم استخدامها أو تعديلها.</li>
                    <li>يرجى التواصل مع خدمة العملاء لتأكيد تفاصيل الإرجاع قبل الشحن.</li>
                  </>
                ) : (
                  <>
                    <li>Product must be in original, unused condition.</li>
                    <li>Product must include original packaging, inserts, and tags.</li>
                    <li>Products that have been used or altered cannot be returned.</li>
                    <li>Contact customer service to confirm return details before shipping.</li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'كيف أقوم بإرجاع منتج؟' : 'How to Return a Product'}
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {isAr ? (
                  <>
                    <li>تواصل معنا عبر واتساب أو الهاتف لتقديم طلب إرجاع.</li>
                    <li>أرسل صوراً للمنتج والعبوة الأصلية.</li>
                    <li>سنتواصل معك لتأكيد طلب الإرجاع وتزويدك بعنوان الإرجاع.</li>
                    <li>أرسل المنتج عبر شركة شحن موثوقة.</li>
                    <li>بعد استلامنا وفحص المنتج، سيتم معالجة استرداد الأموال خلال 5-10 أيام عمل.</li>
                  </>
                ) : (
                  <>
                    <li>Contact us via WhatsApp or phone to initiate a return.</li>
                    <li>Send photos of the product and original packaging.</li>
                    <li>We will confirm your return request and provide a return address.</li>
                    <li>Ship the product via a reliable courier service.</li>
                    <li>After we receive and inspect the product, refund will be processed within 5-10 business days.</li>
                  </>
                )}
              </ol>
            </div>

            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'طرق الاسترداد' : 'Refund Methods'}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {isAr ? (
                  <>
                    <li>استرداد الأموال عبر نفس طريقة الدفع الأصلية.</li>
                    <li>استرداد عبر التحويل البنكي إذا كانت طريقة الدفع أخرى.</li>
                    <li>قد يستغرق الاسترداد 5-10 أيام عمل لظهور المبلغ في حسابك.</li>
                  </>
                ) : (
                  <>
                    <li>Refund via the original payment method.</li>
                    <li>Bank transfer refund if the original payment method is unavailable.</li>
                    <li>Refund may take 5-10 business days to appear in your account.</li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'الاستبدال' : 'Exchanges'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'تواصل مع خدمة العملاء لمعرفة تفاصيل الاستبدال للمنتجات الجديدة غير المستخدمة ومع عبوتها الأصلية.'
                  : 'Contact customer service for exchange details for new, unused products with their original packaging.'}
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'بضائع تالفة أو خاطئة' : 'Damaged or Wrong Items'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'إذا وصل طلبك تالفاً أو به أخطاء، يرجى التواصل معنا في غضون 24 ساعة من الاستلام. نرسل لك بدائل أو نقوم بإرجاع المبلغ كاملاً.'
                  : 'If your order arrives damaged or incorrect, please contact us within 24 hours of receipt. We will send replacements or issue a full refund.'}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
