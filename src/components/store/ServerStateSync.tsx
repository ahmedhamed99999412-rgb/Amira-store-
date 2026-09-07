'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

export function ServerStateSync({ locale }: { locale: string }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    void Promise.all([
      useCartStore.getState().syncFromServer(locale, Boolean(user)),
      useWishlistStore.getState().syncFromServer(locale, Boolean(user)),
    ]);
  }, [locale, loading, user?.id]);

  return null;
}