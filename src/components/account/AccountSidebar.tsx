'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { LayoutDashboard, Package, MapPin, Heart, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function AccountSidebar({
  user,
  locale,
}: {
  user: { username: string; fullName: string | null; role: string };
  locale: string;
}) {
  const t = useTranslations('account');
  const router = useRouter();
  const { logout } = useAuth();

  const items = [
    { href: '/account', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/account/orders', label: t('orders'), icon: Package },
    { href: '/account/addresses', label: t('addresses'), icon: MapPin },
    { href: '/wishlist', label: t('wishlist'), icon: Heart },
    { href: '/account/settings', label: t('settings'), icon: Settings },
  ];

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* User info */}
      <div className="p-4 bg-brand-cream rounded-lg">
        <div className="w-12 h-12 rounded-full bg-brand-mauve text-white flex items-center justify-center text-lg font-bold mb-2">
          {(user.fullName || user.username).charAt(0).toUpperCase()}
        </div>
        <p className="font-medium text-brand-charcoal">
          {user.fullName || user.username}
        </p>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>

      {/* Nav */}
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-brand-charcoal hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {user.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-brand-mauve hover:bg-brand-mauve/10 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            {locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </button>
      </nav>
    </div>
  );
}
