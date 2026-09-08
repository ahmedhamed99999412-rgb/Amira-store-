import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { getBannerLink } from '@/lib/banner-link';

type PromoBanner = {
  id: string;
  base64Data: string;
  mimeType: string;
  titleAr: string | null;
  titleEn: string | null;
  subtitleAr: string | null;
  subtitleEn: string | null;
  ctaTextAr: string | null;
  ctaTextEn: string | null;
  ctaLink: string | null;
};

export function PromoBanners({ banners, locale }: { banners: PromoBanner[]; locale: string }) {
  if (banners.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => {
            const title = locale === 'ar' ? banner.titleAr : banner.titleEn;
            const subtitle = locale === 'ar' ? banner.subtitleAr : banner.subtitleEn;
            const ctaText = locale === 'ar' ? banner.ctaTextAr : banner.ctaTextEn;
            const ctaLink = getBannerLink(banner.ctaLink, locale) || '/shop';

            return (
              <div
                key={banner.id}
                className="relative h-[300px] sm:h-[400px] rounded-lg overflow-hidden group"
              >
                <img
                  src={`/api/images/${banner.id}`}
                  alt={title || ''}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                <div className="relative h-full flex flex-col justify-center p-8 sm:p-10 max-w-md">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/80 mb-2">
                    {title}
                  </p>
                  <h3 className="font-serif text-3xl sm:text-4xl font-medium text-white mb-3">
                    {subtitle}
                  </h3>
                  {ctaText && (
                    <Button
                      asChild
                      variant="outline"
                      className="bg-white text-brand-charcoal border-white hover:bg-white/90 hover:text-brand-charcoal rounded-full px-6 py-2 h-10 text-xs font-bold tracking-wider uppercase w-fit"
                    >
                      {ctaLink.startsWith('http') ? <a href={ctaLink} target="_blank" rel="noopener noreferrer">{ctaText}</a> : <Link href={ctaLink}>{ctaText}</Link>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
