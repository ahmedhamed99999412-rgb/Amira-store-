import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ProductCard, type ProductCardData } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';

export function TrendingProducts({
  products,
  locale,
}: {
  products: ProductCardData[];
  locale: string;
}) {
  const t = useTranslations('trending');

  if (products.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-brand-cream">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-brand-charcoal">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 tracking-wide">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            asChild
            variant="outline"
            className="rounded-none border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white px-8 py-3 h-11 text-xs font-bold tracking-wider uppercase"
          >
            <Link href="/shop">{t('viewAll')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
