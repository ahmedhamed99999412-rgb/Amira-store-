'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getBannerLink } from '@/lib/banner-link';

type HeroBanner = {
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

export function HeroCarousel({ banners, locale }: { banners: HeroBanner[]; locale: string }) {
  const t = useTranslations('hero');
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, banners.length]);

  if (banners.length === 0) return null;

  const isRtl = locale === 'ar';

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[480px] sm:h-[560px] md:h-[640px] lg:h-[700px]">
        {banners.map((banner, idx) => {
          const isActive = idx === current;
          const title = locale === 'ar' ? banner.titleAr : banner.titleEn;
          const subtitle = locale === 'ar' ? banner.subtitleAr : banner.subtitleEn;
          const ctaText = locale === 'ar' ? banner.ctaTextAr : banner.ctaTextEn;
          const ctaLink = getBannerLink(banner.ctaLink, locale) || '/shop';

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <img
                  src={`/api/images/${banner.id}`}
                  alt={title || ''}
                  className="w-full h-full object-cover"
                />
                {/* Multi-layer gradient for premium text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="relative h-full container mx-auto px-4 sm:px-8 flex items-center">
                <div className="max-w-lg sm:max-w-xl">
                  {/* Kicker - small label above title */}
                  {title && (
                    <div className="inline-flex items-center gap-2 mb-4">
                      <span className="h-px w-8 bg-white/60" />
                      <p className="text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase text-white/80">
                        {title}
                      </p>
                    </div>
                  )}

                  {/* Main headline - large serif */}
                  {subtitle && (
                    <h1
                      className="font-serif text-3xl sm:text-5xl md:text-6xl font-medium text-white leading-[1.15] mb-4"
                      style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
                    >
                      {subtitle}
                    </h1>
                  )}

                  {/* Description */}
                  <p
                    className="text-sm sm:text-base text-white/85 mb-8 max-w-md leading-relaxed"
                    style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
                  >
                    {locale === 'ar'
                      ? 'اكتشف أحدث صيحات الموضة بتشكيلتنا الحصرية المصممة خصيصاً لك'
                      : 'Discover the latest fashion trends with our exclusive collection designed just for you'}
                  </p>

                  {/* CTA Button - premium styled with inline styles */}
                  {ctaText && (
                    ctaLink.startsWith('http') ? (
                      <a
                        href={ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 h-12 px-8 text-xs font-bold tracking-[0.15em] uppercase rounded-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
                      >
                        {ctaText}
                        <span className="text-base leading-none">{isRtl ? '←' : '→'}</span>
                      </a>
                    ) : (
                      <Link
                        href={ctaLink}
                        className="inline-flex items-center justify-center gap-2 h-12 px-8 text-xs font-bold tracking-[0.15em] uppercase rounded-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
                      >
                        {ctaText}
                        <span className="text-base leading-none">{isRtl ? '←' : '→'}</span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Dots - minimal pill style */}
        {banners.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
