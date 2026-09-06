'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Search, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

type TrackedOrder = {
  orderNumber: string;
  status: string;
  shippingStatus: string;
  subtotal: number;
  shippingCost: number | null;
  total: number;
  createdAt: string;
  guestName: string;
  guestAddress: string;
  governorate: string;
  city: string;
  items: Array<{
    productNameAr: string;
    productNameEn: string;
    productPrice: number;
    quantity: number;
    productImage: string;
  }>;
};

const STATUS_STEPS = ['PENDING_CONFIRMATION', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];

export function TrackOrderClient({ locale }: { locale: string }) {
  const t = useTranslations('trackOrder');
  const tOrder = useTranslations('order');
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.orderNumber.trim() || !form.phone.trim()) {
      setError(locale === 'ar' ? 'يرجى إدخال جميع البيانات' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const params = new URLSearchParams({
        orderNumber: form.orderNumber.trim(),
        phone: form.phone.trim(),
      });
      const res = await fetch(`/api/orders/track?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('notFound'));
        return;
      }
      setOrder(data.order);
    } catch {
      setError(t('notFound'));
    } finally {
      setLoading(false);
    }
  }

  function getStatusIndex(status: string): number {
    if (status === 'CANCELLED') return -1;
    return STATUS_STEPS.indexOf(status);
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="font-serif text-3xl font-medium text-brand-charcoal text-center mb-2">
        {t('title')}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {locale === 'ar' ? 'أدخل رقم طلبك ورقم تليفونك لتتبع الطلب' : 'Enter your order number and phone to track your order'}
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-muted/30 p-6 rounded-lg border border-border mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">{t('orderNumber')}</Label>
            <Input id="orderNumber" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} placeholder="ORD-2026-123456" className="h-11" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01012345678" className="h-11" dir="ltr" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full mt-4 h-11 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              <Search className="h-4 w-4 me-2" />
              {t('submit')}
            </>
          )}
        </Button>
      </form>

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Order result */}
      {order && (
        <div className="space-y-6">
          {/* Status tracker */}
          {order.status === 'CANCELLED' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
              <p className="font-medium text-red-600">{tOrder('status.CANCELLED')}</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = getStatusIndex(order.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = idx === 0 ? Package : idx === 1 ? CheckCircle2 : idx === 2 ? Truck : CheckCircle2;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative">
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`absolute top-6 ${locale === 'ar' ? 'right-1/2' : 'left-1/2'} w-full h-0.5 ${idx < currentIdx ? 'bg-green-600' : 'bg-border'}`} />
                      )}
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 ${isDone ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-border text-muted-foreground'} ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className={`text-xs mt-2 text-center ${isDone ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                        {tOrder(`status.${step}`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="bg-white border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{tOrder('orderNumber')}</p>
                <p className="font-mono font-bold text-brand-charcoal" dir="ltr">{order.orderNumber}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
              </p>
            </div>

            {/* Shipping info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{locale === 'ar' ? 'الاسم' : 'Name'}</p>
                <p className="font-medium">{order.guestName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{locale === 'ar' ? 'العنوان' : 'Address'}</p>
                <p className="font-medium">{order.guestAddress}, {order.city}, {order.governorate}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-border pt-4 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  {item.productImage && (
                    <img src={item.productImage} alt="" className="w-12 h-16 object-cover rounded bg-muted" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-charcoal">
                      {locale === 'ar' ? item.productNameAr : item.productNameEn}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.productPrice, locale)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-brand-charcoal">
                    {formatPrice(item.productPrice * item.quantity, locale)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span>{formatPrice(order.subtotal, locale)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{locale === 'ar' ? 'الشحن' : 'Shipping'}</span>
                <span>
                  {order.shippingStatus === 'FREE'
                    ? (locale === 'ar' ? 'مجاني' : 'FREE')
                    : order.shippingCost !== null
                    ? formatPrice(order.shippingCost, locale)
                    : (locale === 'ar' ? 'يتم تحديده' : 'TBD')}
                </span>
              </div>
              <div className="flex justify-between font-bold text-brand-charcoal pt-2 border-t border-border">
                <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span>{formatPrice(order.total, locale)}</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button asChild variant="outline" className="rounded-none">
              <Link href="/shop">{locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
