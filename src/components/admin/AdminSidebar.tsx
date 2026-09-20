'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Image as ImageIcon,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/products', labelKey: 'products', icon: Package },
  { href: '/admin/categories', labelKey: 'categories', icon: FolderTree },
  { href: '/admin/orders', labelKey: 'orders', icon: ShoppingBag },
  { href: '/admin/customers', labelKey: 'customers', icon: Users },
  { href: '/admin/banners', labelKey: 'banners', icon: ImageIcon },
  { href: '/admin/reviews', labelKey: 'reviews', icon: MessageSquare },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
];

export function AdminSidebar({ locale, storeName }: { locale: string; storeName?: string | null }) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsed(localStorage.getItem('admin-sidebar-collapsed') === 'true');
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-sidebar-collapsed', String(next));
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  const SidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-charcoal to-[#0f0f0f] text-white">
      <div className={`px-3 py-4 border-b border-white/5 ${collapsed ? 'px-2' : ''}`}>
        <Link
          href="/admin"
          className="flex items-center gap-2.5 group"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? `${storeName || (locale === 'ar' ? 'أميرا' : 'AMIRA')} - ${t('title')}` : undefined}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-mauve to-brand-mauve/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="font-serif text-base font-bold text-white">A</span>
          </div>
          {!collapsed && (
            <div className="leading-none overflow-hidden">
              <div className="font-serif text-base font-bold tracking-wide whitespace-nowrap">
                {storeName || (locale === 'ar' ? 'أميرا' : 'AMIRA')}
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-brand-mauve mt-0.5 whitespace-nowrap">
                {t('title')}
              </div>
            </div>
          )}
        </Link>
      </div>

      <button
        onClick={toggleCollapse}
        className="hidden lg:flex items-center justify-center w-full py-2 text-white/40 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5"
        aria-label={collapsed ? t('expand') : t('collapse')}
        title={collapsed ? tCommon('expandMenu') : tCommon('collapseMenu')}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <div className="px-3 py-1.5 mb-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {tCommon('mainMenu')}
            </span>
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all group ${collapsed ? 'justify-center' : ''} ${active ? 'bg-brand-mauve text-white shadow-md shadow-brand-mauve/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {active && !collapsed && (
                <span className="absolute -start-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-mauve rounded-r-full" />
              )}
              <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-transform ${active ? '' : 'group-hover:scale-110'}`} />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-white/5 space-y-1">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? t('viewStore') : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors group ${collapsed ? 'justify-center' : ''}`}
        >
          <Store className="h-[18px] w-[18px] flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>{t('viewStore')}</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? t('logout') : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-red-300/80 hover:text-red-300 hover:bg-red-500/10 transition-colors group ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 bg-gradient-to-r from-brand-charcoal to-[#0f0f0f] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-mauve flex items-center justify-center">
            <span className="font-serif text-sm font-bold">A</span>
          </div>
          <span className="font-serif text-base font-bold">
            {storeName || (locale === 'ar' ? 'أميرا' : 'AMIRA')}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 px-2"
          onClick={() => setMobileOpen(true)}
          aria-label={tCommon('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <aside className={`hidden lg:flex ${sidebarWidth} flex-shrink-0 sticky top-0 h-screen flex-col transition-all duration-200`}>
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[min(17rem,82vw)] h-full shadow-2xl animate-in slide-in-from-start-5 duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 end-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label={tCommon('closeMenu')}
            >
              <X className="h-4 w-4" />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
