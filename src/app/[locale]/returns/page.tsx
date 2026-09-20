import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export const revalidate = 60;

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

  const whatsappDigits = settings.whatsappNumber.trim().replace(/\D/g, '');
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith('0') ? `20${whatsappDigits.slice(1)}` : whatsappDigits}` : null;

  return (
    <>
      <Header categories={categories} locale={locale} storeName={storeName} announcement={announcement} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">
            {isAr ? 'الإرجاع والاستبدال' : 'Returns & Exchanges'}
          </h1>

          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                {isAr
                  ? 'صفحة الإرجاع والاستبدال لا تحدد شروطًا أو مددًا ثابتة من تلقاء نفسها. يجب التواصل مع خدمة العملاء أولًا لتأكيد أهلية المنتج وإجراءات الإرجاع أو الاستبدال المناسبة للطلب.'
                  : 'This page does not publish fixed return windows or automatic eligibility rules. Please contact customer service first to confirm eligibility and the appropriate return or exchange process for your order.'}
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'قبل إرسال المنتج' : 'Before sending the product'}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {isAr ? (
                  <>
                    <li>لا ترسل المنتج قبل الحصول على تأكيد من خدمة العملاء.</li>
                    <li>احتفظ بالمنتج وحالته وملحقاته كما استلمتها لحين مراجعة الطلب.</li>
                    <li>سيتم توضيح عنوان الإرجاع وطريقة الإجراء بعد الموافقة على الطلب.</li>
                  </>
                ) : (
                  <>
                    <li>Do not ship the product before receiving confirmation from customer service.</li>
                    <li>Keep the product, condition, and included items as received while the request is reviewed.</li>
                    <li>The return address and process will be provided after the request is approved.</li>
                  </>
                )}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl font-medium text-brand-charcoal mb-4">
                {isAr ? 'الاستفسار وطلب المساعدة' : 'Questions and support'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'أرسل رقم الطلب وصور المنتج عند الحاجة، وسيتواصل معك فريق خدمة العملاء لتوضيح الخطوات المطلوبة.'
                  : 'Share your order number and product photos when needed. Customer service will explain the required next steps.'}
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
