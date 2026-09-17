'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

// Tracks whether a persisted store has finished loading from localStorage,
// via Zustand's own persist API (reliable) rather than a custom state field
// set from outside the store's own actions (was never resolving for guests).
function usePersistHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }) {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());
  useEffect(() => {
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);
  return hydrated;
}

export function ServerStateSync({ locale }: { locale: string }) {
  const { user, loading } = useAuth();
  const cartHydrated = usePersistHydrated(useCartStore);
  const wishlistHydrated = usePersistHydrated(useWishlistStore);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (loading || !cartHydrated || !wishlistHydrated) return;

    const now = Date.now();
    if (now - lastSyncRef.current < 5000) return;
    lastSyncRef.current = now;

    const run = async () => {
      await Promise.all([
        useCartStore.getState().syncFromServer(locale, Boolean(user), true),
        useWishlistStore.getState().syncFromServer(locale, Boolean(user), true),
      ]);
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
