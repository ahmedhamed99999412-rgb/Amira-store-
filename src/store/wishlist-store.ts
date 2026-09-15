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
  totalStock?: number;
  hasVariants?: boolean;
  reviewCount?: number;
  avgRating?: number;
};

type ServerWishlistItem = WishlistItem & { id?: string };

type WishlistState = {
  items: WishlistItem[];
  hydrated: boolean;
  toggleItem: (item: WishlistItem) => boolean;
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

function normalizeWishlistItems(items: ServerWishlistItem[]): WishlistItem[] {
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
      totalStock: typeof item.totalStock === 'number' ? item.totalStock : undefined,
      hasVariants: typeof item.hasVariants === 'boolean' ? item.hasVariants : undefined,
      reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : undefined,
      avgRating: typeof item.avgRating === 'number' ? item.avgRating : undefined,
    }))
    .filter((item) => Boolean(item.productId && item.slug));
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      toggleItem: (item) => {
        ++wishlistMutationVersion;
        const exists = get().items.some((current) => current.productId === item.productId);
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

        set((state) => ({
          items: exists
            ? state.items.filter((current) => current.productId !== item.productId)
            : [...state.items.filter((current) => current.productId !== item.productId), item],
        }));

        void operation.catch(() => {
          // The optimistic change is rolled back from the authoritative server state
          // only when the mutation fails. Successful add/remove operations already
          // have an explicit server response and do not need a second GET.
          void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
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
        }).catch(() => {
          void useWishlistStore.getState().syncFromServer(currentLocale(), false, false);
        });

        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
      },

      hasItem: (productId) => get().items.some((item) => item.productId === productId),
      clear: () => set({ items: [] }),
      getCount: () => get().items.length,

      syncFromServer: async (locale, isAuthenticated, mergeLocal = false) => {
        void isAuthenticated;
        const syncId = ++latestWishlistSync;
        const syncMutationVersion = wishlistMutationVersion;
        try {
          const response = await fetch('/api/wishlist', {
            credentials: 'include',
            headers: { 'x-locale': locale },
          });
          if (!response.ok || syncId !== latestWishlistSync || syncMutationVersion !== wishlistMutationVersion) return;

          const data = (await response.json()) as { items?: ServerWishlistItem[] };
          const serverItems = normalizeWishlistItems(data.items || []);
          const localItems = normalizeWishlistItems(get().items);

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
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Use Zustand's setter so subscribers (ProductCard/ServerStateSync) are
          // notified that persisted state is ready. Direct mutation leaves
          // hydrated subscribers stuck on the pre-hydration value.
          state.items = normalizeWishlistItems(state.items);
          useWishlistStore.setState({ items: state.items, hydrated: true });
        }
      },
    }
  )
);
