'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useState, useTransition } from 'react';
import { Search, User, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { SearchBox } from '@/components/layout/SearchBox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type Category = {
  id: string;
  slug: string;
  name: string;
  image?: { base64Data: string; mimeType: string } | null;
  children: { id: string; slug: string; name: string }[];
};

export function Header({
  categories,
  locale,
  storeName,
  announcement,
  cartCount = 0,
}: {
  categories: Category[];
  locale: string;
  storeName: string;
  announcement: string;
  cartCount?: number;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isRtl = locale === 'ar';

  function switchLocale() {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  }

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="bg-brand-mauve text-white text-xs sm:text-sm">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex-1 text-center sm:text-start overflow-hidden">
            <span className="truncate inline-block">{announcement}</span>
          </div>
          <button
            onClick={switchLocale}
            disabled={isPending}
            className="shrink-0 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium"
          >
            {t('announcement.language')}
          </button>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-4">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? 'right' : 'left'} className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{storeName}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="border-b border-border pb-2 mb-2">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="block py-2 font-medium hover:text-brand-mauve"
                      onClick={() => setMobileOpen(false)}
                    >
                      {cat.name}
                    </Link>
                    {cat.children.length > 0 && (
                      <div className="ps-4 flex flex-col gap-1">
                        {cat.children.map((child) => (
                          <Link
                            key={child.id}
                            href={`/category/${child.slug}`}
                            className="py-1 text-sm text-muted-foreground hover:text-brand-mauve"
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="flex flex-col items-center leading-none">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-brand-charcoal">
                {storeName.split(' ')[0] || storeName}
              </span>
              <span className="text-[10px] sm:text-xs tracking-[0.3em] text-muted-foreground uppercase mt-1">
                {storeName.split(' ').slice(1).join(' ') || 'STORE'}
              </span>
            </div>
          </Link>

          {/* Search (desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchBox locale={locale} variant="desktop" />
          </div>

          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label={t('common.search')}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Account */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex flex-col items-center gap-0.5 h-auto py-1">
                  <User className="h-5 w-5" />
                  <span className="text-[10px] hidden sm:block">{t('header.account')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    <DropdownMenuLabel>{user.fullName || user.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="w-full">{t('account.title')}</Link>
                    </DropdownMenuItem>
                    {user.role === 'ADMIN' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="w-full">{t('admin.title')}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => void handleLogout()}
                      className="text-destructive cursor-pointer"
                    >
                      {t('header.logout')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="w-full">{t('header.login')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register" className="w-full">{t('header.register')}</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Wishlist */}
            <Button variant="ghost" size="icon" asChild className="flex flex-col items-center gap-0.5 h-auto py-1">
              <Link href="/wishlist">
                <Heart className="h-5 w-5" />
                <span className="text-[10px] hidden sm:block">{t('header.wishlist')}</span>
              </Link>
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="icon" asChild className="flex flex-col items-center gap-0.5 h-auto py-1 relative">
              <Link href="/cart">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -end-2 bg-brand-mauve text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] hidden sm:block">{t('header.cart')}</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Search (mobile) - expandable panel */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <SearchBox locale={locale} variant="mobile" />
          </div>
        )}
      </div>

      {/* Navigation (desktop) */}
      <nav className="hidden lg:block border-t border-border">
        <div className="container mx-auto px-4">
          <ul className="flex items-center justify-center gap-8 py-3">
            {categories.map((cat) => (
              <li key={cat.id} className="group relative">
                <Link
                  href={`/category/${cat.slug}`}
                  className="text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-mauve transition-colors py-2 inline-block"
                >
                  {cat.name}
                </Link>
                {cat.children.length > 0 && (
                  <div className="absolute top-full start-0 bg-white shadow-lg border border-border rounded-md min-w-[200px] py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                    {cat.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/category/${child.slug}`}
                        className="block px-4 py-2 text-sm hover:bg-muted hover:text-brand-mauve"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
            <li>
              <Link
                href="/shop?sale=true"
                className="text-xs font-semibold tracking-wider uppercase text-red-600 hover:text-red-700 transition-colors py-2 inline-block"
              >
                {t('nav.sale')}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 start-0 end-0 z-50 bg-white/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
        <ul className="flex items-center justify-around py-2">
          <li>
            <Link href="/" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-brand-mauve transition-colors">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] font-medium">{t('header.home')}</span>
            </Link>
          </li>
          <li>
            <Link href="/shop" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-brand-mauve transition-colors">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] font-medium">{t('header.shop')}</span>
            </Link>
          </li>
          <li>
            <Link href="/wishlist" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-brand-mauve transition-colors relative">
              <Heart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -end-1 bg-brand-mauve text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{t('header.wishlist')}</span>
            </Link>
          </li>
          <li>
            <Link href="/cart" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-brand-mauve transition-colors relative">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -end-1 bg-brand-mauve text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{t('header.cart')}</span>
            </Link>
          </li>
          <li>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-brand-mauve transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('header.mobileMenu')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
