# Phase 5 Wishlist Fix

Scope: wishlist behavior only.

## Root cause

`GET /api/wishlist` returned the product identifier as `id`, while the client wishlist store and its synchronization logic use `productId`. After a server sync, the stored items therefore lost their `productId`. This broke `hasItem`, merge/sync behavior, and could make a wishlist toggle appear to work temporarily and then disappear.

## Minimal fix

- Keep the existing `id` response field for compatibility.
- Add `productId: p.id` to the wishlist API response.
- Normalize both the current server response shape and any previously persisted localStorage shape in `wishlist-store.ts`.
- Normalize persisted wishlist state during rehydration so stale items from the old shape do not produce `/api/wishlist/undefined` requests.

No product, category, user, order, or database rows are deleted or modified by this patch.
