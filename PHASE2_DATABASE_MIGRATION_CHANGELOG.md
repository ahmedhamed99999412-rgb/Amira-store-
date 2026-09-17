# Phase 2 — Database / Migration Integrity Repair

## Scope

This patch changes **only** `prisma/migrations/20260913150000_phase5_schema_parity/migration.sql`.

## Root cause confirmed

The previous parity migration was not safe against the current baseline:

- `products.differentPriceBySize` already exists in the baseline.
- `product_variants.regularPrice` already exists in the baseline.
- `product_variants.salePrice` already exists in the baseline.
- the current baseline does not contain the legacy Free Shipping columns in `store_settings`.

As a result, the old migration could fail on a fresh database created from the current baseline.

## Minimal repair

The migration now:

- uses `ADD COLUMN IF NOT EXISTS` for the already-baselined pricing columns;
- uses `DROP COLUMN IF EXISTS` for legacy Free Shipping columns;
- adds each CHECK constraint only when that constraint name is not already present;
- does not delete application rows;
- does not reset or truncate any table;
- does not modify the baseline migration.

## Production safety

The baseline migration is intentionally left unchanged because changing an already-applied baseline can create Prisma migration checksum/history problems.

This patch does **not** run a production migration and does **not** claim that Neon is already migrated.

## Required verification before production apply

1. Run `prisma migrate status` against the actual Neon database.
2. Confirm the baseline is marked appropriately before deployment if the database still has no `_prisma_migrations` history.
3. Run the parity migration only after that explicit status check.
4. Re-check constraints and the target columns after migration.
