# Amira V6 — Final Wishlist + Lint Repair

## Root-cause scope
This patch keeps the prior wishlist UI/hydration fix and addresses the exact GitHub Actions lint failures reported after the V6 deployment attempt.

## Exact fixes
- `src/components/admin/ReviewsManagerClient.tsx`
  - Deferred initial `loadReviews()` with a zero-delay browser timer so the React `set-state-in-effect` rule is satisfied without changing the request or admin review behavior.
- `src/components/checkout/CheckoutClient.tsx`
  - Removed the effect that synchronously reset coupon state when subtotal changed.
  - Tracks the subtotal against which a coupon was validated and derives an `effectiveCouponApplied`/`effectiveCouponDiscount` value during render.
  - Prevents a previously validated coupon from being submitted/displayed after the cart subtotal changes, without an effect-driven state cascade.
- `src/components/ui/dialog.tsx`
  - Moved `useTranslations("common")` to the top of `DialogContent`, eliminating the conditional hook call while preserving the close label.
- `src/components/ui/sidebar.tsx`
  - Moved `useTranslations("common")` to the top of `Sidebar`, eliminating the conditional hook call while preserving mobile/desktop labels.
- `tsconfig.json`
  - Preserves `allowImportingTsExtensions: true` required by the existing test imports and Vercel TypeScript build.
- Prior V6 wishlist fixes remain included:
  - wishlist/cart hydration notification fix
  - wishlist race protection
  - ProductCard heart state synchronization after refresh
  - heart button separated from product navigation

## Safety
- No database migration.
- No seed/reset/truncate.
- No product/category/category-tree data changes.
- No order/payment/stock schema changes.

## Verification
Full GitHub Actions/Vercel lint/build must be used for final remote verification. This working environment does not contain the project's installed `node_modules`, so no false local lint/build claim is made.
