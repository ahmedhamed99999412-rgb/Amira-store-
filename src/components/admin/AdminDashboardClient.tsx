'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  PackageX,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Stat = {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
};

type Day = { date: string; label: string; revenue: number };

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  governorate: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
};

type LowStock = {
  id: string;
  stock: number;
  size: string;
  color: string;
  productNameAr: string;
  productNameEn: string;
  productSlug: string;
  image: string | null;
};

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US'
  ).format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DELIVERED':
      return 'default';
    case 'CONFIRMED':
      return 'secondary';
    case 'SHIPPING':
      return 'outline';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function statusLabelKey(status: string): string {
  switch (status) {
    case 'PENDING_CONFIRMATION':
      return 'pendingConfirmation';
    case 'CONFIRMED':
      return 'confirmed';
    case 'SHIPPING':
      return 'shipping';
    case 'DELIVERED':
      return 'delivered';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pendingConfirmation';
  }
}

export function AdminDashboardClient({
  stats,
  revenueSeries,
  recentOrders,
  lowStock,
  locale,
}: {
  stats: Stat;
  revenueSeries: Day[];
  recentOrders: RecentOrder[];
  lowStock: LowStock[];
  locale: string;
}) {
  const t = useTranslations('admin');

  const statCards = [
    {
      label: t('totalSales'),
      value: formatPrice(stats.totalSales, locale),
      icon: DollarSign,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: t('totalOrders'),
      value: formatNumber(stats.totalOrders, locale),
      icon: ShoppingBag,
      tint: 'bg-blue-50 text-blue-600',
    },
    {
      label: t('totalProducts'),
      value: formatNumber(stats.totalProducts, locale),
      icon: Package,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      label: t('totalCustomers'),
      value: formatNumber(stats.totalCustomers, locale),
      icon: Users,
      tint: 'bg-purple-50 text-purple-600',
    },
  ];

  const maxRevenue = Math.max(...revenueSeries.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-brand-charcoal mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-sm font-semibold text-brand-charcoal mb-4">
            {t('revenue7Days')}
          </h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {revenueSeries.map((day, i) => {
              const height = Math.max((day.revenue / maxRevenue) * 100, 4);
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {day.revenue > 0
                      ? new Intl.NumberFormat(
                          locale === 'ar' ? 'ar-EG' : 'en-US',
                          { notation: 'compact' }
                        ).format(day.revenue)
                      : ''}
                  </div>
                  <div
                    className="w-full bg-brand-mauve rounded-t-md transition-all hover:bg-brand-charcoal"
                    style={{ height: `${height}%` }}
                    title={formatPrice(day.revenue, locale)}
                  />
                  <div className="text-[10px] text-muted-foreground text-center">
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Low stock alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-charcoal">
              {t('lowStockAlerts')}
            </h2>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          {lowStock.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <PackageX className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t('noLowStock')}
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border"
                >
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                       
                      <img
                        src={item.image}
                        alt={item.productNameEn}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-brand-charcoal truncate">
                      {locale === 'ar' ? item.productNameAr : item.productNameEn}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {[item.size, item.color].filter(Boolean).join(' / ') || '—'}
                    </p>
                  </div>
                  <Badge variant={item.stock === 0 ? 'destructive' : 'secondary'}>
                    {formatNumber(item.stock, locale)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brand-charcoal">
            {t('recentOrders')}
          </h2>
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm" className="text-xs">
              {t('viewAll')}
              <ArrowUpRight className="h-3 w-3 ms-1" />
            </Button>
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('noOrders')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-xs text-muted-foreground">
                  <th className="text-start font-medium pb-2 px-2">{t('orderNumber')}</th>
                  <th className="text-start font-medium pb-2 px-2">{t('customer')}</th>
                  <th className="text-start font-medium pb-2 px-2 hidden md:table-cell">
                    {t('governorate')}
                  </th>
                  <th className="text-start font-medium pb-2 px-2">{t('total')}</th>
                  <th className="text-start font-medium pb-2 px-2">{t('status')}</th>
                  <th className="text-start font-medium pb-2 px-2 hidden sm:table-cell">
                    {t('date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium text-brand-charcoal">
                      {o.orderNumber}
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-medium text-brand-charcoal">
                        {o.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {o.phone}
                      </div>
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">
                      {o.governorate}
                    </td>
                    <td className="py-2 px-2 font-medium text-brand-charcoal">
                      {formatPrice(o.total, locale)}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={statusVariant(o.status)}>
                        {t(statusLabelKey(o.status))}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDate(o.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
