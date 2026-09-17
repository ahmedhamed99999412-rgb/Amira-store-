# Amira Store — Performance + Wishlist Stability Patch

## Scope

Targeted client/server performance and wishlist/cart synchronization fixes only.
No database migration, reset, truncate, seed, product/category mutation, or order/user data changes.

## Confirmed root causes from the supplied project

1. Wishlist API returned product `id` while the client store expected `productId`.
2. Wishlist page made one extra `/api/products/[slug]` request per wishlist item after the wishlist API had already returned complete product data.
3. Every successful wishlist mutation triggered another full wishlist GET, creating unnecessary request/DB work and a race with optimistic UI state.
4. Initial `ServerStateSync` could reconcile persisted client state before both persisted stores were hydrated, allowing visible favorites/cart state to disappear temporarily during refresh.
5. Cart mutations also performed a full cart GET after each mutation. This could race with queued operations and was especially problematic because a newly-created cart item's server ID was only learned from that refresh.
6. Public product/category/banner queries loaded binary base64 image data even though public components only needed image IDs. This unnecessarily inflated server/RSC payloads.
7. Public image delivery checked product image, category image, and banner tables serially for every image request.
8. Public cart/wishlist GETs created empty DB rows on page load instead of being read-only.
9. Product detail data could be fetched redundantly by both `generateMetadata` and the page; the shared query is now request-memoized with React `cache`.

## Changes

- Normalized wishlist items from either `productId` or legacy `id`.
- Wishlist page now renders directly from the normalized server/local item data; no N-request product waterfall.
- Successful wishlist mutations no longer perform a second GET; failed mutations reconcile from the server.
- Wishlist GET is read-only and excludes base64 image payloads.
- Cart mutation flows are optimistic with targeted failure recovery; successful mutations no longer trigger a full cart refresh.
- Cart GET is read-only and payload-slimmed.
- Initial state synchronization waits for auth + persisted cart/wishlist hydration and is deferred slightly so the first UI remains interactive.
- Guest cart/wishlist synchronization is sequenced to avoid competing first-time guest-cookie creation.
- Public product/category/banner queries select only fields used by public UI; binary image data is never serialized into the page payload.
- Public image lookups run in parallel and retain browser caching with stale-while-revalidate.
- Product-card wishlist subscription uses Zustand shallow comparison.

## Validation performed

- TypeScript transpile/syntax validation: all 14 changed TypeScript/TSX files passed.
- Existing `npm test`: 6/6 tests passed.
- Destructive SQL scan on the patch: no new destructive SQL.
- `npm run lint` could not be executed in this environment because the supplied project archive has no installed `eslint` binary/node_modules. This is not represented as a passing lint result.

## Production status

This patch has **not** been claimed as production-verified. It must pass GitHub CI, Vercel build, and real Production browser smoke tests before being marked RELEASE READY.
