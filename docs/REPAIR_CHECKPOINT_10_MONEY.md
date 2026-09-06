# Repair Checkpoint 10 — Server Money Arithmetic

Date: 2026-09-03

## Scope

This checkpoint addresses only floating-point arithmetic in server-side monetary calculations.

## Changes

- Added `src/lib/money.ts` with integer-minor-unit helpers:
  - `roundMoney`
  - `addMoney`
  - `subtractMoney`
  - `multiplyMoney`
  - `percentageMoney`
  - `clampMoney`
- Updated `POST /api/orders` to use the helpers for:
  - line-item price multiplication
  - subtotal accumulation
  - percentage/fixed coupon discount calculation
  - final total calculation
- Updated `POST /api/coupons/validate` to use the helpers for discount calculation/clamping.
- Updated admin order shipping-cost total recalculation to use the helpers.

## Intentionally NOT changed

- Prisma schema / database column types remain unchanged.
- No Float -> Decimal migration was performed.
- Frontend display calculations were not refactored in this checkpoint.
- No UI or checkout layout changes.

## Verification

Focused arithmetic regression tests passed:

- `0.1 + 0.2` -> `0.3`
- `19.99 * 3` -> `59.97`
- `100 - 0.1 - 0.2` -> `99.70`
- `17.35 @ 10%` -> `1.74`
- fixed discount capped to subtotal

Static checks:

- Modified TypeScript files were inspected after edit.
- No raw monetary arithmetic remains in the three targeted server routes where the new helper should be used.
- Full TypeScript/build verification was not run because the current execution environment does not have the project's installed dependencies/Bun runtime.

## Risk assessment

Low relative to a schema migration because this checkpoint does not alter persisted types or API contracts.

## Next step

Before any Float -> Decimal migration, perform a complete money-field inventory and define a PostgreSQL migration + serialization strategy with regression tests.
