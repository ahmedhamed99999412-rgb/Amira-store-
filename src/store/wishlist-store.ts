import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type WishlistItem = {
  productId: string;
  slug: string;
  sku?: string;
  name: string;
  shortDescription?: string;
  category?: string;
  image: string | null;
  price: number;
  comparePrice?: number | null;
  displayPrice?: number;
  displayComparePrice?: number | null;
  minVariantRegularPrice?: number | null;
  minVariantSalePrice?: number | null;
  totalStock?: number;
  hasVariants?: boolean;
  hasSizeVariants?: boolean;
  hasColorVariants?: boolean;
  reviewCount?: number;
  avgRating?: number;
  variantId?: string | null;
  size?: string | null;
  color?: string | null;
};

type ServerWishlistItem = WishlistItem & { id?: string };

type WishlistState = {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => Promise<boolean>;
  removeItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  clear: () => void;
  getCount: () => number;
  syncFromServer: (locale: string, isAuthenticated: boolean, mergeLocal?: boolean) => Promise<void>;
};

let latestWishlistSync = 0;
let wishlistMutationVersion = 0;
const wishlistRequestQueues = new Map<string, Promise<void>>();

function queueWishlistRequest(productId: string, request: () => Promise<Response>) {
  const previous = wishlistRequestQueues.get(productId) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(request);
  const tail = operation.then(() => undefined, () => undefined);
  wishlistRequestQueues.set(productId, tail);
  void tail.finally(() => {
    if (wishlistRequestQueues.get(productId) === tail) wishlistRequestQueues.delete(productId);
  });
  return operation;
}

function currentLocale() {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.lang || document.querySelector('[lang]')?.getAttribute('lang') || 'ar';
}

function normalizeWishlistItems(items: ServerWishlistItem[] | null | undefined): WishlistItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items
    .map((item) => ({
      productId: item.productId || item.id || '',
      slug: item.slug || '',
      sku: item.sku || '',
      name: item.name || item.slug || '',
      shortDescription: item.shortDescription || '',
      category: item.category || '',
      image: item.image ?? null,
      price: typeof item.price === 'number' ? item.price : 0,
      comparePrice: typeof item.comparePrice === 'number' ? item.comparePrice : null,
      displayPrice: typeof item.displayPrice === 'number' ? item.displayPrice : undefined,
      displayComparePrice: typeof item.displayComparePrice === 'number' ? item.displayComparePrice : null,
      minVariantRegularPrice: typeof item.minVariantRegularPrice === 'number' ? item.minVariantRegularPrice : null,
      minVariantSalePrice: typeof item.minVariantSalePrice === 'number' ? item.minVariantSalePrice : null,
      totalStock: typeof item.totalStock === 'number' ? item.totalStock : undefined,
      hasVariants: typeof item.hasVariants === 'boolean' ? item.hasVariants : undefined,
      hasSizeVariants: typeof item.hasSizeVariants === 'boolean' ? item.hasSizeVariants : undefined,
      hasColorVariants: typeof item.hasColorVariants === 'boolean' ? item.hasColorVariants : undefined,
      reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : undefined,
      avgRating: typeof item.avgRating === 'number' ? item.avgRating : undefined,
    }))
    .filter((item) => Boolean(item.productId && item.slug));
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: async (item) => {
        ++wishlistMutationVersion;
        const exists = get().items.some((current) => current.productId === item.productId);
        const prevItems = get().items;
        const nextItems = exists ? prevItems.filter((current) => current.productId !== item.productId) : [...prevItems, item];
        const operation = queueWishlistRequest(item.productId, async () => {
          const response = await fetch(`/api/wishlist/${item.productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-locale': currentLocale() },
            credentials: 'include',
            body: JSON.stringify({ action: exists ? 'remove' : 'add' }),
          });
          if (!response.ok) throw new Error('Wishlist mutation failed');
          return response;
        });

        set((state) => ({ items: nextItems }));

        await operation
          .then(() => {
            ++wishlistMutationVersion;
            void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
          })
          .catch(() => {
            set((state) => ({ items: prevItems }));
            void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
            throw new Error('Wishlist mutation failed');
          });

        return !exists;
      },

      removeItem: (productId) => {
        ++wishlistMutationVersion;
        void queueWishlistRequest(productId, async () => {
          const response = await fetch(`/api/wishlist/${productId}`, {
            method: 'DELETE',
            headers: { 'x-locale': currentLocale() },
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Wishlist remove failed');
          return response;
        })
          .then(() => {
            ++wishlistMutationVersion;
            void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
          })
          .catch(() => {
            void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
          });

        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
      },

      hasItem: (productId) => get().items.some((item) => item.productId === productId),
      clear: () => set({ items: [] }),
      getCount: () => get().items.length,

      syncFromServer: async (locale, isAuthenticated, mergeLocal = false) => {
        const syncId = ++latestWishlistSync;
        const syncMutationVersion = wishlistMutationVersion;
        try {
          const pendingMutations = Array.from(wishlistRequestQueues.values());
          if (pendingMutations.length > 0) await Promise.allSettled(pendingMutations);

          const response = await fetch('/api/wishlist', {
            credentials: 'include',
            headers: { 'x-locale': locale },
          });
          if (!response.ok || syncId !== latestWishlistSync || syncMutationVersion !== wishlistMutationVersion) return;

          const data = (await response.json()) as { items?: ServerWishlistItem[] };
          const serverItems = normalizeWishlistItems(data.items || []);
          const localItems = normalizeWishlistItems(get().items);

          // A guest wishlist is primarily local state. Do not erase it when the
          // server has no guest row yet (or a transient request returns an empty
          // list). The merge path below will persist missing items server-side.
          if (!isAuthenticated && !mergeLocal && serverItems.length === 0 && localItems.length > 0) {
            set({ items: localItems });
            return;
          }

          if (mergeLocal && localItems.length > 0) {
            const serverIds = new Set(serverItems.map((item) => item.productId));
            const missing = localItems.filter((item) => !serverIds.has(item.productId));
            if (missing.length > 0) {
              const results = await Promise.all(missing.map((item) => fetch(`/api/wishlist/${item.productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-locale': locale },
                credentials: 'include',
                body: JSON.stringify({ action: 'add' }),
              })));
              if (syncId !== latestWishlistSync || syncMutationVersion !== wishlistMutationVersion || !results.every((result) => result.ok)) return;
              return get().syncFromServer(locale, isAuthenticated, false);
            }
          }

          if (syncId !== latestWishlistSync || syncMutationVersion !== wishlistMutationVersion) return;
          set({ items: serverItems });
        } catch {
          // Preserve the already-available local wishlist when a background sync fails.
        }
      },
    }),
    {
      name: 'amira-wishlist',
      storage: createJSONStorage(() => localStorage),
      // Only persist the actual data. Hydration-readiness is tracked via
      // Zustand's own persist.hasHydrated()/onFinishHydration() API (see
      // WishlistView), not a custom field baked into the persisted state.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
