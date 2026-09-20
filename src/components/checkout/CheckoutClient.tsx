'use client';

import { formatCurrency } from '@/lib/currency';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCartStore } from '@/store/cart-store';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle } from 'lucide-react';
import { multiplyMoney, subtractMoney, clampMoney } from '@/lib/money';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';

export function CheckoutClient({ locale }: { locale: string }) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string>(
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('amira:idempotency-key') ?? crypto.randomUUID())
      : crypto.randomUUID()
  );
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('amira:idempotency-key', idempotencyKeyRef.current);
    }
  }, []);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [form, setForm] = useState({ guestName: '', guestPhone: '', guestAddress: '', governorate: '', city: '', landmarks: '', guestNotes: '' });

  useEffect(() => {
    if (user) {
      const timeoutId = window.setTimeout(() => {
        setForm((prev) => ({ ...prev, guestName: user.fullName || user.username, guestPhone: user.phone }));
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [user]);

  const subtotal = getTotalPrice();
  const totalAfterDiscount = clampMoney(subtractMoney(subtotal, couponDiscount), 0, subtotal);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const syncedSubtotal = useCartStore.getState().items.reduce((sum, i) => sum + multiplyMoney(i.price, i.quantity), 0);
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: syncedSubtotal }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('invalidCoupon'));
        setCouponDiscount(0);
        setCouponApplied(false);
        setAppliedCouponCode('');
        setCouponError(data.error || null);
        return;
      }
      setCouponDiscount(data.discount);
      setCouponApplied(true);
      setAppliedCouponCode(couponCode.trim());
      toast.success(t('couponApplied', { discount: formatCurrency(data.discount, locale) }));
    } catch {
      toast.error(t('failedCoupon'));
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setCouponApplied(false);
    setCouponDiscount(0);
    setAppliedCouponCode('');
    setCouponError(null);
    setCouponCode('');
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{tCart('empty')}</p>
        <Button asChild className="mt-4 bg-brand-charcoal text-white rounded-none"><Link href="/shop">{tCart('continueShopping')}</Link></Button>
      </div>
    );
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guestName.trim() || !form.guestPhone.trim() || !form.guestAddress.trim() || !form.governorate.trim() || !form.city.trim()) {
      toast.error(t('fillRequired'));
      return;
    }
    if (!/^01[0125][0-9]{8}$/.test(form.guestPhone.trim())) {
      toast.error(t('invalidPhone'));
      return;
    }

    setSubmitting(true);
    try {
      let currentCouponCode = appliedCouponCode;
      let currentCouponDiscount = couponDiscount;

      if (currentCouponCode) {
        const syncedSubtotal = useCartStore.getState().items.reduce((sum, i) => sum + multiplyMoney(i.price, i.quantity), 0);
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-locale': locale },
          body: JSON.stringify({ code: currentCouponCode, subtotal: syncedSubtotal }),
          credentials: 'include',
        });
        const couponData = await res.json();
        if (!res.ok || couponData.discount === undefined) {
          setCouponApplied(false);
          setCouponDiscount(0);
          setAppliedCouponCode('');
          currentCouponCode = '';
          currentCouponDiscount = 0;
          toast.error(couponData.error || t('invalidCoupon'));
        } else {
          currentCouponDiscount = couponData.discount;
        }
      }

      const syncedSubtotal = useCartStore.getState().items.reduce((sum, i) => sum + multiplyMoney(i.price, i.quantity), 0);

      await useCartStore.getState().syncFromServer(locale, Boolean(user), false);
      const currentItems = useCartStore.getState().items;
      if (currentItems.length === 0) {
        toast.error(tCart('empty'));
        return;
      }

      const couponBody = currentCouponCode ? { code: currentCouponCode, subtotal: syncedSubtotal } : undefined;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current, 'x-locale': locale },
        body: JSON.stringify({
          items: currentItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          guestName: form.guestName,
          guestPhone: form.guestPhone,
          guestAddress: form.guestAddress,
          governorate: form.governorate,
          city: form.city,
          landmarks: form.landmarks || undefined,
          guestNotes: form.guestNotes || undefined,
          couponCode: couponBody?.code,
          ...(couponBody && { couponCode: couponBody.code, couponSubtotal: couponBody.subtotal }),
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('orderError'));
        return;
      }
      if (currentCouponCode) {
        setCouponApplied(false);
        setCouponDiscount(0);
        setAppliedCouponCode('');
        setCouponCode('');
      }
      idempotencyKeyRef.current = crypto.randomUUID();
      clearCart();
      if (data.whatsappUrl) {
        window.location.assign(data.whatsappUrl);
        return;
      }
      router.push(`/checkout/success?${new URLSearchParams({ orderNumber: data.order.orderNumber }).toString()}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('orderError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
      <div>
        <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">{t('title')}</h1>
        {!user && (
          <div className="mb-6 p-4 bg-brand-cream rounded-lg text-sm">
            <p className="text-muted-foreground">
              {t('loginToSave')}{' '}
              <Link href="/login" className="text-brand-mauve hover:underline font-medium">{t('login')}</Link>
              {' · '}{t('guestCheckout')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">{t('contactInfo')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="guestName">{t('fullName')} *</Label><Input id="guestName" value={form.guestName} onChange={(e) => update('guestName', e.target.value)} required className="h-11" /></div>
              <div className="space-y-2"><Label htmlFor="guestPhone">{t('phone')} *</Label><Input id="guestPhone" type="tel" value={form.guestPhone} onChange={(e) => update('guestPhone', e.target.value)} required placeholder="01012345678" className="h-11" dir="ltr" /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">{t('shippingAddress')}</h2>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="guestAddress">{t('address')} *</Label><Textarea id="guestAddress" value={form.guestAddress} onChange={(e) => update('guestAddress', e.target.value)} required rows={3} placeholder={t('addressPlaceholder')} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="governorate">{t('governorate')} *</Label><Input id="governorate" value={form.governorate} onChange={(e) => update('governorate', e.target.value)} required className="h-11" placeholder={t('governoratePlaceholder')} /></div>
                <div className="space-y-2"><Label htmlFor="city">{t('city')} *</Label><Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} required className="h-11" placeholder={t('cityPlaceholder')} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="landmarks">{t('landmarks')}</Label><Input id="landmarks" value={form.landmarks} onChange={(e) => update('landmarks', e.target.value)} className="h-11" /></div>
              <div className="space-y-2"><Label htmlFor="guestNotes">{t('notes')}</Label><Textarea id="guestNotes" value={form.guestNotes} onChange={(e) => update('guestNotes', e.target.value)} rows={2} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">{t('paymentMethod')}</h2>
            <div className="p-4 border-2 border-brand-charcoal rounded-lg bg-brand-cream/30"><div className="flex items-start gap-3"><div className="w-5 h-5 rounded-full border-2 border-brand-charcoal flex items-center justify-center mt-0.5"><div className="w-2.5 h-2.5 rounded-full bg-brand-charcoal" /></div><div><p className="font-medium text-brand-charcoal">{t('cod')}</p><p className="text-xs text-muted-foreground mt-1">{t('codDesc')}</p></div></div></div>
          </div>
        </form>
      </div>

      <div className="lg:sticky lg:top-32 h-fit">
        <div className="p-6 border border-border rounded-lg bg-muted/30">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-4">{t('orderSummary')}</h2>
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                {item.image ? <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded bg-muted" /> : <div className="w-16 h-20 bg-muted rounded" />}
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-brand-charcoal line-clamp-2">{item.name}</p>{(item.size || item.color) && <p className="text-[10px] text-muted-foreground mt-0.5">{item.size}{item.size && item.color && ' · '}{item.color}</p>}<p className="text-xs text-muted-foreground mt-1">{item.quantity} × {formatCurrency(item.price, locale)}</p></div>
                <p className="text-xs font-bold text-brand-charcoal">{formatCurrency(multiplyMoney(item.price, item.quantity), locale)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{tCart('subtotal')}</span><span className="font-medium">{formatCurrency(subtotal, locale)}</span></div>
            {couponError && (
              <div className="text-xs text-red-500 mt-1">{couponError}</div>
            )}
            <div className="py-2">
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2"><span className="text-xs text-green-700 font-medium">{t('couponLabel', { code: appliedCouponCode })}</span><div className="flex items-center gap-2"><span className="text-xs font-bold text-green-700">-{formatCurrency(couponDiscount, locale)}</span><button type="button" onClick={removeCoupon} className="text-xs text-red-600 hover:underline">{t('remove')}</button></div></div>
              ) : (
                <div className="flex gap-2"><input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder={t('couponCodePlaceholder')} className="flex-1 h-9 px-3 border border-border rounded-md text-sm" dir="ltr" /><button type="button" onClick={applyCoupon} disabled={applyingCoupon || !couponCode.trim()} className="h-9 px-4 bg-muted hover:bg-muted/80 rounded-md text-xs font-medium transition-colors disabled:opacity-50">{applyingCoupon ? '...' : t('apply')}</button></div>
              )}
            </div>
            {couponDiscount > 0 && <div className="flex items-center justify-between text-sm text-green-700"><span>{t('discount')}</span><span className="font-medium">-{formatCurrency(couponDiscount, locale)}</span></div>}
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{tCart('shipping')}</span><span className="text-muted-foreground italic text-right max-w-[55%]">{t('shippingManual')}</span></div>
            <div className="flex items-center justify-between pt-2 border-t border-border"><span className="font-medium">{tCart('total')}</span><span className="text-xl font-bold text-brand-charcoal">{formatCurrency(totalAfterDiscount, locale)}</span></div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-6 h-12 bg-green-600 hover:bg-green-700 text-white rounded-none">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MessageCircle className="h-5 w-5 me-2" />{t('whatsappCta')}</>}</Button>
          <p className="text-xs text-muted-foreground text-center mt-3">{t('whatsappNote')}</p>
        </div>
      </div>
    </div>
  );
}
