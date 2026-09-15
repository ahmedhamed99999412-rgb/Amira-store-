'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

type User = {
  id: string;
  username: string;
  phone: string;
  fullName: string | null;
  role: 'CUSTOMER' | 'ADMIN';
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user from /api/auth/me
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout: call API to clear cookie, then clear local state
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      useCartStore.getState().clearCart();
      useWishlistStore.getState().clear();
    }
  }, []);

  // Fetch user on mount. Defer the async state update so the effect itself
  // does not synchronously trigger a cascading render.
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const run = () => {
      void refresh();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      cleanup = () => window.cancelIdleCallback(id);
    } else {
      const timeoutId = window.setTimeout(run, 1000);
      cleanup = () => window.clearTimeout(timeoutId);
    }

    return () => cleanup?.();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
