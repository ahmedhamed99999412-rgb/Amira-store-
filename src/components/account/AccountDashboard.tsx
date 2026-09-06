'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Package, MapPin, ShoppingBag } from 'lucide-react';

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function AccountDashboard({
  stats,
  locale,
}: {
  stats: { ordersCount: number; addressesCount: number; totalSpent: number };
  locale: string;
}) {
  const t = useTranslations('account');

  const cards = [
    {
      label: t('totalOrders'),
      value: stats.ordersCount,
      icon: Package,
      href: '/account/orders',
    },
    {
      label: t('addresses'),
      value: stats.addressesCount,
      icon: MapPin,
      href: '/account/addresses',
    },
    {
      label: t('totalSpent'),
      value: formatPrice(stats.totalSpent, locale),
      icon: ShoppingBag,
      href: '/account/orders',
    },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-medium text-brand-charcoal mb-6">
        {t('title')}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className="p-6 border border-border rounded-lg hover:border-brand-mauve hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center text-brand-mauve mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-brand-charcoal">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="p-6 bg-brand-cream rounded-lg">
        <h2 className="font-medium text-brand-charcoal mb-2">
          {locale === 'ar' ? 'مرحباً بك في حسابك' : 'Welcome to your account'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {locale === 'ar'
            ? 'من هنا يمكنك إدارة طلباتك وعناوينك وإعدادات حسابك'
            : 'From here you can manage your orders, addresses, and account settings'}
        </p>
      </div>
    </div>
  );
}
