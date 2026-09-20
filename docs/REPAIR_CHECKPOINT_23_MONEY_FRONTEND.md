# Repair Checkpoint 23 — Frontend Money Arithmetic

## Scope
Only client-side cart/checkout monetary arithmetic was changed.

## Changes
- `src/store/cart-store.ts`: cart total now uses shared `addMoney` + `multiplyMoney` helpers.
- `src/components/checkout/CheckoutClient.tsx`: line totals use `multiplyMoney`; subtotal minus coupon discount uses `subtractMoney`.
- `src/components/cart/CartView.tsx`: line totals use `multiplyMoney`.

## Deliberately unchanged
- Prisma schemas and database records.
- API contracts and request payloads.
- Product/cart/checkout business flow.
- UI structure/styling.
- Existing money persistence types (`Float`) — Decimal migration remains a separate task.

## Verification
- Focused source assertions: PASS.
- SQLite schema/table count: 21 tables, 543 rows.
- Database content was not modified by this checkpoint.
- ZIP archive integrity: PASS after packaging.
- Full Next.js/Bun build was not run in this environment because the project's Bun/dependency runtime is unavailable here.
