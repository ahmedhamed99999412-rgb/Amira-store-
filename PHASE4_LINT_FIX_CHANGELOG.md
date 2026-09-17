# Amira Store — Phase 4 lint fix

Scope: exactly the four files reported by GitHub Actions `npm run lint` on commit 58839f9.

Changes:
- `src/components/admin/ReviewsManagerClient.tsx`: defer the initial review load with a zero-delay timer and clean it up on unmount, preserving the existing fetch/filter behavior while satisfying `react-hooks/set-state-in-effect`.
- `src/components/checkout/CheckoutClient.tsx`: replace the subtotal-resetting effect with derived coupon validity (`couponAppliedSubtotal === subtotal`), preserving the behavior that a cart/subtotal change invalidates the previously applied coupon without synchronously setting state in an effect.
- `src/components/ui/dialog.tsx`: call `useTranslations("common")` once at the top of `DialogContent` and reuse it for the close label, fixing the conditional-hook violation.
- `src/components/ui/sidebar.tsx`: call `useTranslations("common")` once at the top of `Sidebar` and reuse it for the mobile title, fixing the conditional-hook violation.

No product/category/order/user data, Prisma schema, migrations, or Production database were changed by this patch.

Validation performed here:
- Reviewed the exact GitHub Actions lint errors and mapped each to the corresponding source location.
- Compared each modified file against its pre-patch copy; only the intended lines changed.
- Verified the expected lint-triggering patterns were removed from the four reported locations.

Local lint/build could not be executed in this runtime because the project archive has no `node_modules` and dependency installation is unavailable here.
