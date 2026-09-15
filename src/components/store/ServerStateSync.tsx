'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

export function ServerStateSync({ locale }: { locale: string }) {
  const { user, loading } = useAuth();
  const cartHydrated = useCartStore((state) => state.hydrated);
  const wishlistHydrated = useWishlistStore((state) => state.hydrated);

  useEffect(() => {
    if (loading || !cartHydrated || !wishlistHydrated) return;

    const run = async () => {
      // Sync sequentially so a fresh guest session gets one shared guest_id cookie
      // before the second resource attempts to merge local state.
      await useCartStore.getState().syncFromServer(locale, Boolean(user), true);
      await useWishlistStore.getState().syncFromServer(locale, Boolean(user), true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => void run(), { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => void run(), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [locale, loading, user?.id, cartHydrated, wishlistHydrated]);

  return null;
}
