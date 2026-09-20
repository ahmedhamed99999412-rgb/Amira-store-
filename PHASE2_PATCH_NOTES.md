# Amira Store — Phase 2 repair patch

Base audited: GitHub main at commit `2759d7549768a2119e3ea48095b11e9f35009465`.

## Confirmed Phase 2 repairs in this patch

1. Cart API quantity cap: cart add/update now enforce the same 1..100 maximum used by order validation.
2. Duplicate add race: when a cart line already exists, quantity is incremented with an atomic Prisma `updateMany` condition instead of a read-then-write overwrite. Concurrent add requests can no longer silently lose an increment.
3. Cart sync/error recovery: client mutations are serialized per product+variant key, remain optimistic in the UI, and re-sync against the server after success/failure instead of using stale snapshots for rollback.
4. Server/client price authority: cart state is refreshed from `/api/cart` after mutations, so stored client prices/variant prices are rehydrated from server data.
5. Login cart merge: `ServerStateSync` first merges the persisted browser cart into the active server cart, then refreshes from the authoritative server cart. This prevents guest cart items from disappearing at login.
6. Login wishlist merge: the same transition strategy is applied to wishlist state, preserving persisted guest wishlist items when an account becomes active.
7. Locale-safe cart mutations: mutation requests continue to use the existing server error contract and locale-aware cart API paths; locale discovery for post-mutation sync is taken from the active locale container.

## Already correct on the audited base (therefore not unnecessarily changed)

- Transactional order creation already recalculates server-side prices and reserves stock atomically.
- Order creation already clears the server-side cart in the same transaction.
- Idempotency-key protection is already present for duplicate order submission.
- Product variants cannot be bypassed from ProductCard quick-add; variant products redirect to the product page.
- Wishlist duplicate prevention and per-product request serialization are already present.
- Cancellation already restores stock from `stockAllocation` and reverses coupon usage safely.
- Free Shipping behavior is not reintroduced; checkout/order use manual shipping.
- `money.ts` already performs arithmetic in two-decimal minor units.

## Important note / remaining Phase 2 watch item

The checkout coupon preview can become visually stale only if the cart is changed outside the checkout view (for example, another tab/context) after a coupon is applied. The order endpoint remains authoritative and revalidates the coupon and recalculates the final total from server-side product prices, so this is not an order-integrity bypass. It is intentionally left for a small follow-up UI patch rather than mixing it into the cart concurrency repair.

## Verification performed here

- TypeScript parser check on the four changed files: no parser/syntax errors were reported.
- A full project `tsc`/Next build was not run in this isolated patch directory because it does not contain the project's `node_modules`; the current production deployment had already built successfully from commit `2759d7549768a2119e3ea48095b11e9f35009465`.

## Files in this patch

- `src/app/api/cart/items/route.ts`
- `src/app/api/cart/items/[id]/route.ts`
- `src/store/cart-store.ts`
- `src/components/store/ServerStateSync.tsx`
