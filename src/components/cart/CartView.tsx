'use client';

import { useCartStore } from '@/store/cart-store';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { multiplyMoney } from '@/lib/money';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function CartView({ locale }: { locale: string }) {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();
  const t = useTranslations('cart');

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30" />
        <h1 className="font-serif text-2xl font-medium text-brand-charcoal mt-4">{t('empty')}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t('emptyDesc')}</p>
        <Button asChild className="mt-6 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
          <Link href="/shop">{t('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const itemCount = getTotalItems();

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-2">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {itemCount} {itemCount === 1 ? t('item') : t('items')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 p-4 border border-border rounded-lg">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-24 h-32 object-cover rounded-md bg-muted" />
              ) : (
                <div className="w-24 h-32 bg-muted rounded-md" />
              )}
              <div className="flex-1">
                <Link href={`/product/${item.slug}`} className="text-sm font-medium text-brand-charcoal hover:text-brand-mauve line-clamp-2">
                  {item.name}
                </Link>
                {(item.size || item.color) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.size && <span>{item.size}</span>}
                    {item.size && item.color && ' · '}
                    {item.color && <span>{item.color}</span>}
                  </p>
                )}
                <p className="text-sm font-bold text-brand-charcoal mt-2">{formatPrice(item.price, locale)}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-border rounded">
                    <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="p-2 hover:bg-muted" aria-label="Decrease">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-4 text-sm font-medium" dir="ltr">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="p-2 hover:bg-muted" aria-label="Increase">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.productId, item.variantId)} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {t('removeItem')}
                  </button>
                </div>
              </div>
              <div className="text-end">
                <p className="text-sm font-bold text-brand-charcoal">{formatPrice(multiplyMoney(item.price, item.quantity), locale)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-32 h-fit">
          <div className="p-6 border border-border rounded-lg bg-muted/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-4">{t('title')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">{formatPrice(subtotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('shipping')}</span>
                <span className="text-muted-foreground italic">
                  {locale === 'ar' ? 'يتم تحديده بعد الطلب' : 'Calculated after order'}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-medium">{t('total')}</span>
                <span className="text-xl font-bold text-brand-charcoal">{formatPrice(subtotal, locale)}</span>
              </div>
            </div>
            <Button asChild className="w-full mt-6 h-12 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
              <Link href="/checkout">
                {t('checkout')}
                <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full mt-2 rounded-none">
              <Link href="/shop">{t('continueShopping')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
