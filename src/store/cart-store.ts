import { create } from 'zustand';
import { addMoney, multiplyMoney } from '@/lib/money';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartItem = {
  serverId?: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncFromServer: (locale: string, isAuthenticated: boolean) => Promise<void>;
};

type ServerCartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    slug: string;
    price: number;
    translations: Array<{ locale: string; name: string }>;
    images: Array<{ id: string }>;
  };
  variant: { size: string | null; color: string | null; priceAdjustment: number } | null;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      addItem: (item) => {
        const existing = get().items.find(
          (current) => current.productId === item.productId && current.variantId === item.variantId
        );
        set((state) => {
          const currentItem = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (currentItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        });
        void fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }),
        }).then(async (response) => {
          if (!response.ok) throw new Error('Cart item could not be saved');
          const data = (await response.json()) as { item?: { id?: string } };
          if (data.item?.id) {
            set((state) => ({
              items: state.items.map((current) =>
                current.productId === item.productId && current.variantId === item.variantId
                  ? { ...current, serverId: data.item?.id }
                  : current
              ),
            }));
          }
        }).catch(() => {
          set((state) => ({
            items: existing
              ? state.items.map((current) =>
                current.productId === item.productId && current.variantId === item.variantId
                  ? { ...current, quantity: Math.max(1, current.quantity - item.quantity) }
                  : current
              )
              : state.items.filter((current) =>
                !(current.productId === item.productId && current.variantId === item.variantId && current.quantity === item.quantity)
              ),
          }));
        });
      },
      removeItem: (productId, variantId) => {
        const item = get().items.find((current) => current.productId === productId && current.variantId === variantId);
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }));
        if (item?.serverId) {
          void fetch(`/api/cart/items/${item.serverId}`, { method: 'DELETE', credentials: 'include' })
            .then((response) => {
              if (!response.ok) throw new Error('Cart item could not be removed');
            })
            .catch(() => set((state) => ({
              items: state.items.some((current) => current.productId === productId && current.variantId === variantId)
                ? state.items
                : [...state.items, item],
            })));
        }
      },
      updateQuantity: (productId, variantId, quantity) => {
        const item = get().items.find((current) => current.productId === productId && current.variantId === variantId);
        const nextQuantity = Math.max(1, quantity);
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: nextQuantity }
              : i
          ),
        }));
        if (item?.serverId) {
          void fetch(`/api/cart/items/${item.serverId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ quantity: nextQuantity }),
            }).then((response) => {
              if (!response.ok) throw new Error('Cart quantity could not be saved');
            }).catch(() => {
              if (item) {
                set((state) => ({
                  items: state.items.map((current) =>
                    current.productId === productId && current.variantId === variantId
                      ? { ...current, quantity: item.quantity }
                      : current
                  ),
                }));
              }
            });
        }
      },
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getTotalPrice: () => get().items.reduce((sum, i) => addMoney(sum, multiplyMoney(i.price, i.quantity)), 0),
      syncFromServer: async (locale, isAuthenticated) => {
        const response = await fetch('/api/cart', {
          credentials: 'include',
          headers: { 'x-locale': locale },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { cart?: { items?: ServerCartItem[] } };
        const serverItems = data.cart?.items || [];
        const localItems = get().items;

        if (serverItems.length === 0 && localItems.length > 0 && !isAuthenticated) {
          const migrationResults = await Promise.all(localItems.map((item) => fetch('/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }),
          })));
          if (!migrationResults.some((migrationResult) => migrationResult.ok)) return;
          return get().syncFromServer(locale, isAuthenticated);
        }

        set({
          items: serverItems.map((item) => ({
            serverId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            slug: item.product.slug,
            name: item.product.translations.find((translation) => translation.locale === locale)?.name
              || item.product.translations.find((translation) => translation.locale === 'ar')?.name
              || item.product.slug,
            image: item.product.images[0] ? `/api/images/${item.product.images[0].id}` : null,
            price: item.product.price + (item.variant?.priceAdjustment || 0),
            quantity: item.quantity,
            size: item.variant?.size || null,
            color: item.variant?.color || null,
          })),
        });
      },
    }),
    {
      name: 'amira-cart',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
