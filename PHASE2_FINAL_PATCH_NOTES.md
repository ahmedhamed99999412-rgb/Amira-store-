# Amira Store — Phase 2 Final Repair Patch

Base reviewed: GitHub `main` at commit `2759d7549768a2119e3ea48095b11e9f35009465`.

This patch is the remaining Phase 2 work. It includes the earlier cart API hardening from Phase 2 Patch 01 because that patch was not yet applied to GitHub, plus the final client-side synchronization fixes.

## Included repairs
- Cart mutation requests are serialized per product+variant key.
- Cart operations are void/non-throwing at the store API so existing call sites cannot create unhandled promise rejections.
- Every cart mutation refreshes from the server; no stale local rollback is trusted after a failed request.
- Guest/local cart state is merged into the active server cart only during explicit state synchronization, including login transition.
- Cart mutations send the active locale to localized APIs.
- Cart and cart-item APIs enforce the same quantity ceiling (100) and distinguish stock failures from the max-quantity failure.
- Invalid variantless cart rows for products that require variants are cleaned instead of reaching checkout.
- Wishlist mutations are serialized per product, carry locale, and refresh from server truth after every mutation.
- Guest/local wishlist items are merged only during explicit state synchronization.
- Checkout re-syncs the cart immediately before order creation so a stale tab does not submit an old cart snapshot.
- Coupon preview is invalidated when the cart subtotal changes and coupon validation carries the locale.
- Server order pricing, coupon consumption, atomic stock reservation, idempotency, and server-cart clearing remain authoritative and were not weakened.

## Explicitly NOT changed
- No Free Shipping logic was reintroduced.
- No Decimal migration was attempted here; the production schema still uses Float and that migration remains a later Phase 5/data migration task.
- No broad UI refactor was performed.

## Verification
- TypeScript syntax was parsed for all changed `.ts/.tsx` files using the installed TypeScript compiler API.
- Full Vercel build must still be the final integration gate after ZIP-to-Git upload because this environment does not contain the complete application `node_modules` tree.


PATCH HOTFIX — Vercel TypeScript error
- Fixed src/app/api/cart/items/route.ts race-recovery branch: after the unique-constraint race, the code now checks existingAfterRace instead of nullable existing.
- No behavior change outside that exact type-safety bug.
