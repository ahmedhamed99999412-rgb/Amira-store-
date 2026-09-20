# Amira Store — V4 root-cause fix: wishlist race + image DB fan-out

## Scope

This patch addresses only the two reported runtime problems:

1. Wishlist hearts/state can disappear because a background `/api/wishlist` sync can finish after a local add/remove and overwrite the optimistic local state with an older server snapshot.
2. The storefront can feel globally slow because every `/api/images/[id]` request performed three database queries (product_images + category_images + banners), even though one image ID is enough to identify the row.
3. Wishlist page stock can be stale because persisted wishlist snapshots were only refreshed when fields were incomplete.
4. Cart sync had the same stale-response race pattern, so it is guarded with the same mutation-version check to avoid visible UI rollback during cart interaction.

## Exact changes

- `src/store/wishlist-store.ts`
  - Added a mutation version counter.
  - Server sync responses are ignored when a newer local wishlist mutation started while the request was in flight.
  - Existing per-product request queue remains intact.
  - Existing optimistic behavior remains intact.
- `src/components/wishlist/WishlistView.tsx`
  - Refreshes authoritative wishlist data whenever the wishlist page is opened after hydration, so real stock/current product state is shown after refresh.
  - Does not run multiple item-level product requests.
- `src/app/api/images/[id]/route.ts`
  - Keeps the same public URL contract.
  - Replaces three Prisma lookups with one parameterized SQL `UNION ALL` query.
  - Keeps binary response + existing cache policy.
- `src/store/cart-store.ts`
  - Added the same mutation-version guard so background cart sync cannot overwrite a newer user action.

## Data safety

- No database migration.
- No products/categories/category relationships changed.
- No order/customer/user data changed.
- No seed/reset/truncate/delete/mass update.
- No pricing, size-pricing, inventory, checkout, or AI behavior intentionally changed.

## Validation performed here

- Reviewed the V3 race path that can overwrite optimistic wishlist state.
- Verified the image endpoint now performs one database round trip instead of three per image request.
- Performed static brace/string sanity checks on changed TypeScript files.

## Production status

NOT production-verified in this environment. Do not mark RELEASE READY until the deployed build succeeds and the wishlist refresh/click/stock behavior is visually verified in Production.
