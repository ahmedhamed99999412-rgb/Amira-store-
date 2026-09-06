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
          return false;
        }
        set((state) => ({ items: [...state.items, item] }));
        return true;
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      hasItem: (productId) => get().items.some((i) => i.productId === productId),
      clear: () => set({ items: [] }),
      getCount: () => get().items.length,
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
