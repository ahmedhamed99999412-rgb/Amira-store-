# Amira Store — Phase 5 Patch Notes

Base revision: `f8e75d07a84dc04aba07e042bb7f9c8a4804487b`

Scope: Database/migration integrity, confirmed Neon schema parity, targeted regression tests, and CI test enforcement.

## Confirmed production facts used for this patch

The production Neon database was inspected read-only on 2026-09-13.

- PostgreSQL project: `amira-store-production`
- Default branch: `production`
- Database: `neondb`
- The database contains the expected 21 application tables.
- `_prisma_migrations` does not exist in the production database.
- Confirmed schema drift:
  - `products.differentPriceBySize` is missing.
  - `product_variants.regularPrice` is missing.
  - `product_variants.salePrice` is missing.
  - legacy Free Shipping columns still exist in `store_settings`.
- Existing indexes and foreign-key relationships were inspected and match the current PostgreSQL Prisma schema in the audited areas.
- Read-only integrity checks found zero current violations for negative monetary values, negative stock, non-positive cart/order quantities, and out-of-range review ratings in the checked tables.

## What this patch changes

1. Replaces the placeholder initial migration with a real PostgreSQL baseline that can reconstruct a fresh database from migration history.
2. Adds a controlled parity migration for the actual Neon drift.
3. Adds database-level integrity checks for stock, quantities, ratings, and monetary values.
4. Fixes a confirmed bug in `percentageMoney()` where the calculated minor-unit value was passed back through the major-unit parser, then adds targeted Node built-in tests for money helpers and stock-allocation parsing.
5. Adds `npm test`, `db:migrate:status`, and `db:migrate:deploy` scripts.
6. Makes CI run the new tests before the production build.

## Important production migration procedure

The current production database was created outside Prisma Migrate, so the normal first `prisma migrate deploy` cannot be run against it immediately: the baseline migration creates tables that already exist.

Before applying the Phase 5 parity migration to production:

1. Create/confirm a Neon snapshot or backup.
2. Using the production PostgreSQL connection, inspect migration status:
   `npm run db:migrate:status`
3. Mark the already-existing production schema as having the baseline applied:
   `npx prisma migrate resolve --applied 20260910135452_init --schema=prisma/schema.postgresql.prisma`
4. Then deploy the real parity migration:
   `npm run db:migrate:deploy`

Do not run step 4 before step 3 on the existing production database.

Do not put a production `DATABASE_URL` or any other secret in GitHub/source control.

## Why automatic migration was NOT added to Vercel build

The current Vercel build is intentionally still `npm run build`. This patch does not silently combine deployment with a database mutation. The correct Neon connection mode for Prisma migration deployment must be verified separately before making migrations part of the deployment command.

## Money precision note

The application still stores money as `DOUBLE PRECISION`/JavaScript numbers. The application already centralizes arithmetic using integer minor-unit rounding in `src/lib/money.ts`. During Phase 5 verification, a real defect in `percentageMoney()` was found and corrected so percentages are calculated from minor units and returned as major units. Regression tests now lock this behavior down.

A full database conversion from floating point to `NUMERIC/DECIMAL` is intentionally NOT bundled into this patch. That conversion changes schema types and touches every money read/write path; it must be performed as a separate controlled migration after a full consumer inventory and data conversion test. This patch does not pretend that larger migration is already complete.

## Not changed intentionally

- Live production data values were not modified by this patch.
- No category taxonomy was invented or changed.
- No Free Shipping business logic was reintroduced.
- No broad testing framework was added.
- No automatic destructive database operation was added to CI/Vercel.

## Verification performed before delivery

- Live Neon schema/table/index/foreign-key inspection completed read-only.
- Existing live data integrity checks for the targeted database constraints returned zero violations where applicable.
- Migration SQL was reviewed against the current PostgreSQL Prisma schema and live Neon structure.
- The added tests cover money arithmetic and stock-allocation parsing.

After this patch is uploaded, the required verification order is:

1. GitHub commit created from this ZIP.
2. Vercel Production build green.
3. CI green, including the new `npm test` step.
4. Controlled Neon baseline resolution + parity migration on production.
5. Re-run database integrity checks.
6. Run the critical production smoke-test matrix before declaring Phase 5 closed.
