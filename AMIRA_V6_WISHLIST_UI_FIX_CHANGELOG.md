# Amira Store — V6 precise wishlist/UI interaction fix

## Root cause addressed

After a full refresh, Zustand persisted state could be rehydrated without notifying subscribers that `hydrated` had changed because the previous callback mutated the state object directly. This prevented the global server-state sync from reliably starting after hydration.

Separately, `ProductCard` computed the heart state through a function-based shallow selector and the heart `<button>` was nested inside a Next.js `<Link>`. The latter is invalid interactive nesting and can cause click/navigation event conflicts.

## Minimal changes

1. `src/store/wishlist-store.ts`
   - Keep the existing persisted wishlist data.
   - During rehydration, normalize the existing items and use Zustand's setter to publish `{ items, hydrated: true }`.
   - No DB changes and no wishlist data deletion.

2. `src/store/cart-store.ts`
   - Publish `hydrated: true` through Zustand's setter so the existing ServerStateSync lifecycle is notified.
   - No cart data changes.

3. `src/components/product/ProductCard.tsx`
   - Subscribe directly to `items.some(productId)` for the heart state.
   - Keep the existing optimistic wishlist mutation.
   - Move the heart button outside the product `<Link>` so it is a standalone interactive control.
   - Preserve the product navigation and cart behavior.

## Not changed

- Products/categories/category relationships
- Product prices/stock/variants
- Wishlist API contract
- Database schema/data
- Authentication behavior
- Checkout/order behavior
- AI behavior

## Verification

Static source inspection completed. Full lint/typecheck/build were not available in this working copy because `node_modules` is not installed. CI/Vercel must be the final verification gate.

## Build compatibility correction

- Restored `compilerOptions.allowImportingTsExtensions: true` in `tsconfig.json`.
- This is required by the existing test imports and fixes Vercel `TS5097` during TypeScript checking.
- No application logic, database schema, seed, product/category data, or wishlist API behavior was changed by this correction.
