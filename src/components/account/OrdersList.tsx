'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  shippingStatus: string;
  shippingCost: number | null;
  subtotal: number;
  total: number;
  itemCount: number;
  createdAt: string;
};

export function OrdersList({ locale }: { locale: string }) {
  const t = useTranslations('account');
  const tOrder = useTranslations('order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/orders', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">...</div>;
  }

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-medium text-brand-charcoal mb-6">
          {t('orders')}
        </h1>
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-4">{t('noOrders')}</p>
          <Button asChild className="mt-4 bg-brand-charcoal text-white rounded-none">
            <Link href="/shop">{locale === 'ar' ? 'ابدأ التسوق' : 'Start Shopping'}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = locale === 'ar' ? {
    PENDING_CONFIRMATION: 'بانتظار التأكيد',
    CONFIRMED: 'مؤكد',
    SHIPPING: 'قيد الشحن',
    DELIVERED: 'تم التسليم',
    CANCELLED: 'ملغي',
  } : {
    PENDING_CONFIRMATION: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPING: 'Shipping',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-medium text-brand-charcoal mb-6">
        {t('orders')}
      </h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono font-bold text-brand-charcoal" dir="ltr">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                order.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                order.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {statusLabels[order.status]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {order.itemCount} {locale === 'ar' ? 'منتج' : 'items'}
              </span>
              <span className="font-bold text-brand-charcoal">
                {formatPrice(order.total, locale)}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <Link
                href={`/track-order?orderNumber=${order.orderNumber}&phone=auto`}
                className="text-xs text-brand-mauve hover:underline"
              >
                {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
