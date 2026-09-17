import { create } from 'zustand';
import { addMoney, multiplyMoney } from '@/lib/money';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_CART_QUANTITY = 100;

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
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncFromServer: (locale: string, isAuthenticated: boolean, mergeLocal?: boolean) => Promise<void>;
};

let latestCartSync = 0;
let cartMutationVersion = 0;
let cartSyncDepth = 0;
const cartRequestQueues = new Map<string, Promise<void>>();
const quantityDebounceTimers = new Map<string, number>();
const QUANTITY_DEBOUNCE_MS = 350;

function quantityDebounceKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? 'none'}`;
}

type ServerCartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    slug: string;
    price: number;
    comparePrice: number | null;
    differentPriceBySize: boolean;
    translations: Array<{ locale: string; name: string }>;
    images: Array<{ id: string }>;
  };
  variant: {
    size: string | null;
    color: string | null;
    regularPrice: number | null;
    salePrice: number | null;
    priceAdjustment: number;
  } | null;
};

function cartItemKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? 'none'}`;
}

function currentLocale() {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.lang || document.querySelector('[lang]')?.getAttribute('lang') || 'ar';
}

function queueCartRequest(key: string, request: () => Promise<Response>) {
  const previous = cartRequestQueues.get(key) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(request);
  const tail = operation.then(() => undefined, () => undefined);
  cartRequestQueues.set(key, tail);
  void tail.finally(() => {
    if (cartRequestQueues.get(key) === tail) cartRequestQueues.delete(key);
  });
  return operation;
}

function toClientItem(item: ServerCartItem, locale: string): CartItem {
  const variant = item.variant;
  const regularBase = variant?.regularPrice ?? item.product.price;
  const regularPrice = regularBase + (variant?.priceAdjustment ?? 0);
  const salePrice =
    variant?.salePrice !== null && variant?.salePrice !== undefined
      ? variant.salePrice + (variant?.priceAdjustment ?? 0)
      : item.product.price + (variant?.priceAdjustment ?? 0);

  return {
    serverId: item.id,
    productId: item.productId,
    variantId: item.variantId,
    slug: item.product.slug,
    name:
      item.product.translations.find((translation) => translation.locale === locale)?.name ||
      item.product.translations.find((translation) => translation.locale === 'ar')?.name ||
      item.product.slug,
    image: item.product.images[0] ? `/api/images/${item.product.images[0].id}` : null,
    price: salePrice ?? regularPrice,
    quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, item.quantity)),
    size: variant?.size || null,
    color: variant?.color || null,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        ++cartMutationVersion;
        const key = cartItemKey(item.productId, item.variantId);
        const quantity = Math.min(MAX_CART_QUANTITY, Math.max(1, item.quantity));
        const existingBefore = get().items.find((current) =>
          current.productId === item.productId && current.variantId === item.variantId
        );

        set((state) => {
          const existing = state.items.find((current) =>
            current.productId === item.productId && current.variantId === item.variantId
          );
          if (existing) {
            return {
              items: state.items.map((current) =>
                current.productId === item.productId && current.variantId === item.variantId
                  ? { ...current, quantity: Math.min(MAX_CART_QUANTITY, current.quantity + quantity) }
                  : current
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, { ...item, quantity }], isOpen: true };
        });

        void queueCartRequest(key, async () => {
          const response = await fetch('/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-locale': currentLocale() },
            credentials: 'include',
            body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity }),
          });
          if (!response.ok) throw new Error('Cart add failed');

          const data = (await response.json()) as { item?: { id?: string; quantity?: number } };
          if (data.item?.id) {
            set((state) => ({
              items: state.items.map((current) =>
                current.productId === item.productId && current.variantId === item.variantId
                  ? { ...current, serverId: data.item!.id }
                  : current
              ),
            }));
          }
          return response;
        }).catch(() => {
          // Do NOT roll back immediately. The POST may have succeeded
          // server-side despite the client-side failure (network timeout,
          // response loss). syncFromServer will reconcile: if the server
          // has the item, serverId is set correctly; if not, the optimistic
          // item remains in local state.
          void useCartStore.getState().syncFromServer(currentLocale(), false, true);
        });
      },

      removeItem: (productId, variantId) => {
        ++cartMutationVersion;
        const key = cartItemKey(productId, variantId);
        const removed = get().items.find((item) => item.productId === productId && item.variantId === variantId);
        if (!removed) return;

        set((state) => ({
          items: state.items.filter((item) => !(item.productId === productId && item.variantId === variantId)),
        }));

        void queueCartRequest(key, async () => {
          if (!removed.serverId) return new Response(null, { status: 204 });
          const response = await fetch(`/api/cart/items/${removed.serverId}`, {
            method: 'DELETE',
            headers: { 'x-locale': currentLocale() },
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Cart remove failed');
          return response;
        }).catch(() => {
          set((state) => {
            const alreadyPresent = state.items.some((item) =>
              item.productId === productId && item.variantId === variantId
            );
            return alreadyPresent ? state : { items: [...state.items, removed] };
          });
        });
      },

      updateQuantity: (productId, variantId, requestedQuantity) => {
        ++cartMutationVersion;
        const key = cartItemKey(productId, variantId);
        const quantity = Math.min(MAX_CART_QUANTITY, Math.max(1, requestedQuantity));
        const previousQuantity = get().items.find(
          (item) => item.productId === productId && item.variantId === variantId
        )?.quantity;

        if (previousQuantity === undefined) return;

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        }));

        const debounceKey = quantityDebounceKey(productId, variantId);
        const existingTimer = quantityDebounceTimers.get(debounceKey);
        if (existingTimer) clearTimeout(existingTimer);

        const timeoutId = window.setTimeout(() => {
          quantityDebounceTimers.delete(debounceKey);
          void queueCartRequest(key, async () => {
            const current = get().items.find((item) => item.productId === productId && item.variantId === variantId);
            if (!current?.serverId) return new Response(null, { status: 204 });

            const response = await fetch(`/api/cart/items/${current.serverId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-locale': currentLocale() },
              credentials: 'include',
              body: JSON.stringify({ quantity }),
            });
            if (!response.ok) throw new Error('Cart update failed');
            return response;
          }).catch(() => {
            set((state) => ({
              items: state.items.map((item) =>
                item.productId === productId && item.variantId === variantId
                  ? { ...item, quantity: previousQuantity }
                  : item
              ),
            }));
          });
        }, QUANTITY_DEBOUNCE_MS);

        quantityDebounceTimers.set(debounceKey, timeoutId);
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((sum, item) => {
        if (!Number.isFinite(item.price) || !Number.isFinite(item.quantity)) return sum;
        return addMoney(sum, multiplyMoney(item.price, item.quantity));
      }, 0),

  syncFromServer: async (locale, isAuthenticatedParam, mergeLocal = false) => {
    const syncId = ++latestCartSync;
    const syncMutationVersion = cartMutationVersion;
    const response = await fetch('/api/cart', {
      credentials: 'include',
      headers: { 'x-locale': locale },
    });
    if (!response.ok || syncId !== latestCartSync || syncMutationVersion !== cartMutationVersion) return;

    const data = (await response.json()) as { cart?: { items?: ServerCartItem[] } };
    const serverItems = data.cart?.items || [];
    const localItems = get().items;

    if (isAuthenticatedParam && mergeLocal && localItems.length > 0) {
          const serverByKey = new Map(serverItems.map((item) => [cartItemKey(item.productId, item.variantId), item]));
          const mutations: Promise<Response>[] = [];

          for (const localItem of localItems) {
            const serverItem = serverByKey.get(cartItemKey(localItem.productId, localItem.variantId));
            if (!serverItem) {
              mutations.push(fetch('/api/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-locale': locale },
                credentials: 'include',
                body: JSON.stringify({ productId: localItem.productId, variantId: localItem.variantId, quantity: Math.min(MAX_CART_QUANTITY, localItem.quantity) }),
              }));
            } else if (localItem.quantity > serverItem.quantity) {
              mutations.push(fetch(`/api/cart/items/${serverItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-locale': locale },
                credentials: 'include',
                body: JSON.stringify({ quantity: Math.min(MAX_CART_QUANTITY, localItem.quantity) }),
              }));
            }
          }

          if (mutations.length > 0) {
            const results = await Promise.all(mutations);
            if (syncId !== latestCartSync || syncMutationVersion !== cartMutationVersion || !results.every((result) => result.ok)) return;
            if (cartSyncDepth >= 3) return;
            cartSyncDepth++;
            return get().syncFromServer(locale, isAuthenticatedParam, false).finally(() => { cartSyncDepth--; });
          }
        }

        if (syncId !== latestCartSync || syncMutationVersion !== cartMutationVersion) return;
        set({ items: serverItems.map((item) => toClientItem(item, locale)) });
      },
    }),
    {
      name: 'amira-cart',
      storage: createJSONStorage(() => localStorage),
      // Only persist the actual data. Hydration-readiness is tracked via
      // Zustand's own persist.hasHydrated()/onFinishHydration() API instead
      // of a custom field baked into the persisted state (see ServerStateSync).
      partialize: (state) => ({ items: state.items }),
    }
  )
);
