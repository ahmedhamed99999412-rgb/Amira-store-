'use client';

import { useCartStore } from '@/store/cart-store';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function formatPrice(a: number, l: string) {
  const f = new Intl.NumberFormat(l === 'ar' ? 'ar-EG' : 'en-US').format(a);
  return l === 'ar' ? `${f} ج.م` : `EGP ${f}`;
}

function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function CartDrawer({ locale }: { locale: string }) {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const t = useTranslations('cart');
  const mounted = useHydrated();

  if (!mounted) return null;

  const total = getTotalPrice();
  const itemCount = items.length;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()}>
      <SheetContent side={locale === 'ar' ? 'left' : 'right'} className="w-[90%] sm:w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('cart.title')}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-brand-charcoal">{t('empty')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('emptyDesc')}</p>
            </div>
            <Button asChild onClick={closeCart} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
              <Link href="/shop">{t('continueShopping')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 pb-4 border-b border-border">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-md bg-muted" />
                  ) : (
                    <div className="w-20 h-24 bg-muted rounded-md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.slug}`} onClick={closeCart} className="text-sm font-medium text-brand-charcoal hover:text-brand-mauve line-clamp-2">
                      {item.name}
                    </Link>
                    {(item.size || item.color) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.size}
                        {item.size && item.color && ' · '}
                        {item.color}
                      </p>
                    )}
                    <p className="text-sm font-bold text-brand-charcoal mt-1">{formatPrice(item.price, locale)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded text-sm">
                        <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="p-1.5 hover:bg-muted" aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3" dir="ltr">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="p-1.5 hover:bg-muted" aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.productId, item.variantId)} className="text-xs text-red-600 hover:underline">
                        {t('removeItem')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('total')}</span>
                <span className="text-lg font-bold text-brand-charcoal">{formatPrice(total, locale)}</span>
              </div>
              <Button asChild onClick={closeCart} className="w-full h-11 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
                <Link href="/checkout">{t('checkout')}</Link>
              </Button>
              <Button asChild onClick={closeCart} variant="outline" className="w-full rounded-none">
                <Link href="/cart">{t('title')}</Link>
              </Button>
              <Button asChild onClick={closeCart} variant="ghost" className="w-full rounded-none">
                <Link href="/shop">{t('continueShopping')}</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
