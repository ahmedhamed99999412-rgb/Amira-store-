import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

type Category = {
  id: string;
  slug: string;
  name: string;
  image?: { id: string; base64Data: string; mimeType: string } | null;
};

export function CategoryCircles({ categories }: { categories: Category[] }) {
  const t = useTranslations('categories');

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-brand-charcoal">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 tracking-wide">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-6 sm:gap-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center gap-3"
            >
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-brand-mauve transition-all">
                {cat.image ? (
                  <img
                    src={`/api/images/${cat.image.id}`}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-cream text-brand-mauve text-xs">
                    {cat.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium text-brand-charcoal group-hover:text-brand-mauve transition-colors text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
