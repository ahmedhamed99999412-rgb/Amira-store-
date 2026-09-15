# Repair Checkpoint 11 — Monetary Input Guardrails

## Scope
Only API-boundary validation for monetary inputs was tightened. No database migration or data rewrite was performed.

## Changes
- Added `src/lib/validation/money.ts` for two-decimal monetary validation.
- Applied non-negative two-decimal validation to Admin Product `price`, `comparePrice`, and `costPrice`.
- Applied signed two-decimal validation to Product Variant `priceAdjustment` (negative adjustments remain allowed).
- Applied non-negative two-decimal validation to Admin Order `shippingCost`.
- Applied two-decimal validation to the Coupon preview `subtotal` input.
- Preserved existing money arithmetic helper and all existing API contracts.

## Data audit
All existing monetary values in the reference SQLite database are already at 2 decimal places or fewer.

## Intentionally not changed
- Prisma schemas / DB column types (Decimal migration remains a separate, larger checkpoint).
- Existing database records.
- Frontend UI.
- Product/order/coupon business flows.
