# Amira Store — Vercel build fix for commit 50009c1

Scope: minimal fix for Vercel TypeScript error TS5097.

Changed files (2 only):
- tests/money.test.ts
- tests/order-stock.test.ts

Change in both files:
- Removed the explicit `.ts` extension from imports of source modules.
- No application, database, Prisma schema, product/category data, environment variables, dependencies, or build configuration were changed.

Validation performed:
- Confirmed there are no remaining explicit `.ts` source-module imports under tests/src that match this error pattern.
- Confirmed the only intended code changes are the two import specifiers above.

Local build note:
- A full local `npm run build` could not complete because the uploaded archive did not contain a complete usable node_modules installation; after an attempted dependency install, Prisma's executable was incomplete. This is an environment/setup limitation, not a new code error.

Deployment expectation:
- Upload these two files preserving the paths, commit, and redeploy.
- Vercel should then pass the specific TS5097 errors shown in the provided build log.
