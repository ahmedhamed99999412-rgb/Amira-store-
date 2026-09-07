import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
};

type WishlistState = {
  items: WishlistItem[];
  hydrated: boolean;
  toggleItem: (item: WishlistItem) => boolean;
  removeItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  clear: () => void;
  getCount: () => number;
  syncFromServer: (locale: string, isAuthenticated: boolean) => Promise<void>;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      toggleItem: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          set((state) => ({
            items: state.items.filter((i) => i.productId !== item.productId),
          }));
          void fetch(`/api/wishlist/${item.productId}`, {
            method: 'POST',
            credentials: 'include',
          }).then((response) => {
            if (!response.ok) throw new Error('Wishlist item could not be removed');
          }).catch(() => {
            set((state) => state.items.some((current) => current.productId === item.productId)
              ? state
              : { items: [...state.items, item] });
          });
          return false;
        }
        set((state) => ({ items: [...state.items, item] }));
        void fetch(`/api/wishlist/${item.productId}`, {
          method: 'POST',
          credentials: 'include',
        }).then((response) => {
          if (!response.ok) throw new Error('Wishlist item could not be added');
        }).catch(() => {
          set((state) => ({ items: state.items.filter((current) => current.productId !== item.productId) }));
        });
        return true;
      },
      removeItem: (productId) => {
        const item = get().items.find((current) => current.productId === productId);
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
        void fetch(`/api/wishlist/${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        }).then((response) => {
          if (!response.ok) throw new Error('Wishlist item could not be removed');
        }).catch(() => {
          if (item) set((state) => ({ items: state.items.some((current) => current.productId === productId) ? state.items : [...state.items, item] }));
        });
      },
      hasItem: (productId) => get().items.some((i) => i.productId === productId),
      clear: () => set({ items: [] }),
      getCount: () => get().items.length,
      syncFromServer: async (locale, isAuthenticated) => {
        const response = await fetch('/api/wishlist', {
          credentials: 'include',
          headers: { 'x-locale': locale },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: WishlistItem[] };
        const serverItems = data.items || [];
        const localItems = get().items;

        if (serverItems.length === 0 && localItems.length > 0 && !isAuthenticated) {
          const migrationResults = await Promise.all(localItems.map((item) => fetch(`/api/wishlist/${item.productId}`, {
            method: 'POST',
            credentials: 'include',
          })));
          if (!migrationResults.some((migrationResult) => migrationResult.ok)) return;
          return get().syncFromServer(locale, isAuthenticated);
        }

        set({ items: serverItems });
      },
    }),
    {
      name: 'amira-wishlist',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
