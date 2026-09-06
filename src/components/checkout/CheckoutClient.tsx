'use client';

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
import { multiplyMoney, subtractMoney } from '@/lib/money';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function CheckoutClient({ locale }: { locale: string }) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestAddress: '',
    governorate: '',
    city: '',
    landmarks: '',
    guestNotes: '',
  });

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      const timeoutId = window.setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          guestName: user.fullName || user.username,
          guestPhone: user.phone,
        }));
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [user]);

  const subtotal = getTotalPrice();
  const totalAfterDiscount = subtractMoney(subtotal, couponDiscount);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || (locale === 'ar' ? 'كوبون غير صحيح' : 'Invalid coupon'));
        setCouponDiscount(0);
        setCouponApplied(false);
        return;
      }
      setCouponDiscount(data.discount);
      setCouponApplied(true);
      toast.success(locale === 'ar' ? `تم تطبيق الكوبون! خصم ${data.discount} ج.م` : `Coupon applied! ${data.discount} EGP off`);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تطبيق الكوبون' : 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  }

  // Empty cart → show message
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{tCart('empty')}</p>
        <Button asChild className="mt-4 bg-brand-charcoal text-white rounded-none">
          <Link href="/shop">{tCart('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.guestName.trim() || !form.guestPhone.trim() || !form.guestAddress.trim() || !form.governorate.trim() || !form.city.trim()) {
      toast.error(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (!/^01[0125][0-9]{8}$/.test(form.guestPhone.trim())) {
      toast.error(locale === 'ar' ? 'رقم التليفون غير صحيح' : 'Invalid phone number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          guestName: form.guestName,
          guestPhone: form.guestPhone,
          guestAddress: form.guestAddress,
          governorate: form.governorate,
          city: form.city,
          landmarks: form.landmarks || undefined,
          guestNotes: form.guestNotes || undefined,
          couponCode: couponApplied ? couponCode.trim() : undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to place order');
        return;
      }

      // The same key is reusable for transport-level retries. Rotate it only
      // after the server has confirmed the order was created successfully.
      idempotencyKeyRef.current = crypto.randomUUID();

      // Clear cart
      clearCart();

      // Redirect to success page with order info
      const params = new URLSearchParams({
        orderNumber: data.order.orderNumber,
        whatsapp: data.whatsappUrl,
      });
      router.push(`/checkout/success?${params.toString()}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
      {/* Form */}
      <div>
        <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-6">
          {t('title')}
        </h1>

        {!user && (
          <div className="mb-6 p-4 bg-brand-cream rounded-lg text-sm">
            <p className="text-muted-foreground">
              {t('loginToSave')}{' '}
              <Link href="/login" className="text-brand-mauve hover:underline font-medium">
                {locale === 'ar' ? 'سجل دخولك' : 'Login'}
              </Link>
              {' · '}
              {t('guestCheckout')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
              {t('contactInfo')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">{t('fullName')} *</Label>
                <Input id="guestName" value={form.guestName} onChange={(e) => update('guestName', e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPhone">{t('phone')} *</Label>
                <Input id="guestPhone" type="tel" value={form.guestPhone} onChange={(e) => update('guestPhone', e.target.value)} required placeholder="01012345678" className="h-11" dir="ltr" />
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
              {t('shippingAddress')}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guestAddress">{t('address')} *</Label>
                <Textarea id="guestAddress" value={form.guestAddress} onChange={(e) => update('guestAddress', e.target.value)} required rows={3} placeholder={locale === 'ar' ? 'الشارع، رقم المبنى، الشقة...' : 'Street, building number, apartment...'} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="governorate">{t('governorate')} *</Label>
                  <Input id="governorate" value={form.governorate} onChange={(e) => update('governorate', e.target.value)} required className="h-11" placeholder={locale === 'ar' ? 'القاهرة' : 'Cairo'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('city')} *</Label>
                  <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} required className="h-11" placeholder={locale === 'ar' ? 'مدينة نصر' : 'Nasr City'} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landmarks">{t('landmarks')}</Label>
                <Input id="landmarks" value={form.landmarks} onChange={(e) => update('landmarks', e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestNotes">{t('notes')}</Label>
                <Textarea id="guestNotes" value={form.guestNotes} onChange={(e) => update('guestNotes', e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
              {t('paymentMethod')}
            </h2>
            <div className="p-4 border-2 border-brand-charcoal rounded-lg bg-brand-cream/30">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-brand-charcoal flex items-center justify-center mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-charcoal" />
                </div>
                <div>
                  <p className="font-medium text-brand-charcoal">{t('cod')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('codDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Order summary */}
      <div className="lg:sticky lg:top-32 h-fit">
        <div className="p-6 border border-border rounded-lg bg-muted/30">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-4">
            {t('orderSummary')}
          </h2>

          {/* Items */}
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded bg-muted" />
                ) : (
                  <div className="w-16 h-20 bg-muted rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-brand-charcoal line-clamp-2">{item.name}</p>
                  {(item.size || item.color) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.size}
                      {item.size && item.color && ' · '}
                      {item.color}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.quantity} × {formatPrice(item.price, locale)}
                  </p>
                </div>
                <p className="text-xs font-bold text-brand-charcoal">
                  {formatPrice(multiplyMoney(item.price, item.quantity), locale)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tCart('subtotal')}</span>
              <span className="font-medium">{formatPrice(subtotal, locale)}</span>
            </div>

            {/* Coupon input */}
            <div className="py-2">
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  <span className="text-xs text-green-700 font-medium">
                    {locale === 'ar' ? `كوبون ${couponCode} - خصم` : `Coupon ${couponCode} - discount`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-700">-{formatPrice(couponDiscount, locale)}</span>
                    <button
                      type="button"
                      onClick={() => { setCouponApplied(false); setCouponDiscount(0); setCouponCode(''); }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {locale === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={locale === 'ar' ? 'كود الخصم' : 'Coupon code'}
                    className="flex-1 h-9 px-3 border border-border rounded-md text-sm"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="h-9 px-4 bg-muted hover:bg-muted/80 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {applyingCoupon ? '...' : (locale === 'ar' ? 'تطبيق' : 'Apply')}
                  </button>
                </div>
              )}
            </div>

            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-700">
                <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                <span className="font-medium">-{formatPrice(couponDiscount, locale)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tCart('shipping')}</span>
              <span className="text-muted-foreground italic">
                {locale === 'ar' ? 'يتم تحديده بعد الطلب' : 'Calculated after order'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-medium">{tCart('total')}</span>
              <span className="text-xl font-bold text-brand-charcoal">{formatPrice(totalAfterDiscount, locale)}</span>
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-6 h-12 bg-green-600 hover:bg-green-700 text-white rounded-none">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <MessageCircle className="h-5 w-5 me-2" />
                {t('whatsappConfirm')}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            {locale === 'ar' ? 'سيتم تحويلك لواتساب لتأكيد الطلب' : 'You will be redirected to WhatsApp to confirm your order'}
          </p>
        </div>
      </div>
    </div>
  );
}
