# AMIRA STORE - Release Audit 2026-09-06

## Final Verdict

**BLOCKED**

The application has a Ready production deployment in the requested Vercel Hobby account and successfully reads Neon data, but the latest redeployment after correcting runtime secrets is still building. GitHub CI for the latest commit is also still in progress, so the final post-fix authentication gate is not yet closed.

## GitHub

- Repository: `ahmedhamed99999412-rgb/Amira-store-`
- Branch: `main`
- Verified commits:
  - `9378af1` - Prisma/Vercel production build fix
  - `ee3b6ec` - deterministic ephemeral CI database
  - `5eff0f8` - production Prisma schema selection when Vercel install variables are unavailable

## CI

- CI workflow: `.github/workflows/ci.yml`
- Commit `9378af1` failed because GitHub Actions had no `DATABASE_URL`.
- CI was changed to use an ephemeral SQLite database, create its schema, and seed only that temporary database.
- Local CI-equivalent validation passed: seed, typecheck, lint, and build.
- GitHub Actions run for `5eff0f8` was observed as **in progress** at audit time.

## Neon and Database

- Project: `Amira-store`
- Branch: `production`
- Database: `neondb`
- Schema: `public`
- PostgreSQL schema validation passed.
- Migration status reports no Prisma migrations; the production database is schema-pushed and not Prisma Migrate-managed.
- Production safety: no reset, drop, branch deletion, or destructive production reset was run.
- Verified restored data includes users, settings, categories, products, images, variants, tags, banners, reviews, orders, carts, wishlists, and coupons.
- `addresses = 0` is expected from the source dump and is not evidence that the database is empty.
- Full production seed completed successfully after orphaned user references were normalized safely.

## Prisma and Build

- `schema.postgresql.prisma` validates successfully.
- The seed foreign-key issue was fixed without deleting production data.
- Vercel build initially failed because `DATABASE_URL` was empty and Prisma generated SQLite.
- The admin page was made dynamic to prevent database queries during static generation.
- Prisma generation now selects PostgreSQL for Vercel installs even when build-time Vercel variables are unavailable.
- Local Vercel-like build passed with Neon PostgreSQL.

## Vercel

- Account/workspace: `ahmedhamed99999412-3218` / Hobby
- Project: `amira-store`
- Git repository is connected to the requested GitHub repository.
- `DATABASE_URL` was updated in Vercel Production and Preview without recording its value here.
- `JWT_SECRET` was updated in Vercel Production and Preview without recording its value here.
- A redeploy was executed from the Vercel dashboard for the production project.
- The previous Ready deployment served the Arabic storefront and database-backed products API.
- The newest redeployment was still building at audit time.

## Runtime Verification

Verified on the Ready deployment:

- `/ar`: HTTP 200 and Arabic storefront rendered.
- `/en`: HTTP 200 and English storefront rendered.
- `/en/shop`: rendered successfully.
- `/api/products`: returned Neon-backed product data.
- `/api/cart`: returned a guest cart from the database.
- `/en/admin`: redirected unauthenticated users to login.
- Product images were referenced through `/api/images/...`.
- Admin record exists in Neon, is active, and its password hash matches the configured local admin password in a boolean-only verification.

Pending after the latest redeployment:

- Re-test admin login with the corrected Vercel `JWT_SECRET`.
- Re-test `/api/auth/me` after login.
- Re-test protected admin routes and runtime logs.
- Confirm latest GitHub CI success.
- Confirm latest Vercel deployment becomes Ready and receives the production alias.

## Environment Audit

Required runtime variables used by source code:

- `DATABASE_URL`: required, secret, Production and Preview.
- `JWT_SECRET`: required in production, secret, Production and Preview.
- `JWT_EXPIRES_IN`: optional with a `7d` default, secret/config, Production and Preview.
- `NEXT_PUBLIC_APP_URL`: optional fallback exists, public/config, Production and Preview.
- `ADMIN_PASSWORD`: seed-only secret; not required for normal runtime login after the admin record exists.
- `ALLOW_DESTRUCTIVE_SEED`: seed-only guard; must remain `false` in Production.
- `ADMIN_USERNAME`, `ADMIN_PHONE`, `STORE_WHATSAPP_NUMBER`: seed/store configuration.
- `DIRECT_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`: not referenced by the application source and were not added as required variables.

## Seed and Safety

- `db:seed` is destructive and was used only against an ephemeral CI SQLite database.
- `db:seed:full` is idempotent/upsert-oriented and was executed against Neon after inspection.
- No production `prisma db reset`, `DROP DATABASE`, or production branch deletion was executed.

## Known Limitations and Open Bugs

- Vercel Hobby build status is delayed/stalled in the dashboard for the newest redeployment.
- Public HTTP checks against protected Vercel deployment domains can return the Vercel login page; authenticated browser checks are required until deployment protection is configured.
- No Prisma migration history exists; the production schema is currently managed by schema push.
- AI provider configuration is environment-dependent and was not treated as a release blocker for storefront, database, auth, or checkout smoke tests.

## Rollback Readiness

- Previous Ready deployment remains available through its Vercel deployment URL.
- GitHub main contains the prior known-good commit history.
- No destructive database operation was used, so Neon data remains available for rollback.

## Release Gate Status

| Gate | Status |
|---|---|
| Vercel account/project | PASS |
| Neon project/branch/database | PASS |
| Production database safety | PASS |
| Prisma PostgreSQL schema | PASS |
| Local production-like build | PASS |
| Previous production runtime | PASS |
| Corrected environment variables | PASS |
| Latest Vercel redeploy | IN PROGRESS |
| Latest GitHub CI | IN PROGRESS |
| Final auth regression after env correction | PENDING |
| Final production verdict | BLOCKED |
