# Amira Store — Phase 3/4 Database Safety + CI Patch

Scope: only migration-chain safety and CI verification.

## Changed

- `prisma/migrations/20260913150000_phase5_schema_parity/migration.sql`
  - Keeps the exact tested schema changes.
  - Uses `IF NOT EXISTS` / `IF EXISTS` only for schema elements that may legitimately differ between the baseline-shaped database and the existing production-shaped database.
  - Keeps all 18 integrity constraints explicit; no error-hiding fallback is used.
  - No data deletes, table drops, truncation, or seed behavior.

- `.github/workflows/ci.yml`
  - Adds `npm test` to the existing verification job.
  - Adds a separate PostgreSQL migration job using ephemeral PostgreSQL 16.
  - Validates `schema.postgresql.prisma`.
  - Runs `prisma migrate deploy` on a fresh PostgreSQL database.
  - Runs `prisma migrate status` afterward.
  - Does not use production credentials or destructive seed operations.

## Intentionally not changed

- Products, categories, category relationships, users, orders, banners, settings data.
- `priceAdjustment` in `product_variants`; that is a separate schema/code cleanup and is intentionally outside this migration repair.
- Vercel build command and production deployment behavior.
