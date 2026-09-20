# Amira V8 — Interaction Responsiveness + Public Query Cache

Scope: address the observed "3–4 taps before buttons respond" and slow public page navigation without changing store data or business logic.

## Root causes addressed

- The locale layout mounted AuthProvider + ServerStateSync + CartDrawer + ChatWidget on every public page. These client runtimes added avoidable hydration/network work before the storefront became reliably interactive on slower mobile devices.
- AuthProvider requested `/api/auth/me` immediately after mount, competing with the first render/interaction.
- ServerStateSync started cart and wishlist network synchronization shortly after hydration, again competing with first interaction.
- Public product/category/product-detail queries were not persistently cached across requests, so navigation could repeatedly hit Neon for the same public data.
- Language switching had no warm route cache for the opposite locale.

## Changes

- Added `DeferredStoreRuntime` to defer non-critical CartDrawer, ChatWidget and server-state synchronization until browser idle time.
- Deferred AuthProvider's initial auth request until idle time (explicit refresh/logout behavior remains unchanged).
- Deferred ServerStateSync until idle time while preserving cart→wishlist ordering and existing mutation/race protections.
- Prefetched the opposite locale for the current pathname during idle time so the Arabic↔English switch is warm when the user taps it.
- Added 60-second server caching to public product-list, category product-list, product-detail, and related-product queries.

## Not changed

- No DB schema changes.
- No product/category/category-tree data changes.
- No stock, variant, pricing, cart, wishlist, order, AI, WhatsApp, authentication semantics, seed, reset, truncate, or destructive updates.

## Verification status

This patch is NOT production-verified. CI/Vercel must pass first, then production should be tested specifically for:

1. first tap responsiveness on mobile,
2. Arabic↔English switch from the announcement button,
3. Home → Shop → Category → Product navigation,
4. cart/wishlist behavior after delayed background sync,
5. actual response times before/after.
