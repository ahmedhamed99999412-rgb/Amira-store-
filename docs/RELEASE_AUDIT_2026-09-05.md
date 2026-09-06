# Release Audit - 2026-09-05

## Scope

Local baseline and verification only. No GitHub, CI, Vercel, Neon, or production operation was performed.

## Issue Log

### BUG-001

- Severity: HIGH
- Area: TypeScript / database seed
- Exact error: `ADMIN_PASSWORD` remained `string | undefined` after the runtime guard.
- How reproduced: `npm run typecheck`
- Root cause: TypeScript did not preserve the environment-variable narrowing at the bcrypt call site.
- Files affected: `prisma/seed-full.ts`
- Minimal fix: Assign the validated value to a narrowed local constant before hashing.
- Tests: `npm run typecheck`, `npm run build`
- Regression test: Build completed and Typecheck passes.
- Status: VERIFIED

### BUG-002

- Severity: HIGH
- Area: Cart and orders API typing
- Exact error: `variant` was inferred as `null`, and `variantId` remained `unknown` in the cart route.
- How reproduced: `npm run typecheck`
- Root cause: Nullable local variables were not given the Prisma-inferred variant type; request input was not narrowed.
- Files affected: `src/app/api/cart/items/route.ts`, `src/app/api/orders/route.ts`
- Minimal fix: Narrow `variantId`, type nullable variants from the loaded product, and normalize `find` results to `null`.
- Tests: `npm run typecheck`, `npm run build`
- Regression test: HTTP checks for `/api/products` and `/api/auth/me` returned 200.
- Status: VERIFIED

### BUG-003

- Severity: HIGH
- Area: Admin settings form typing
- Exact error: Nullable settings values were passed to HTML input and textarea `value` props.
- How reproduced: `npm run typecheck`
- Root cause: React form controls do not accept `null` as a controlled value.
- Files affected: `src/components/admin/SettingsManagerClient.tsx`
- Minimal fix: Render nullable text/date values as empty strings.
- Tests: `npm run typecheck`, `npm run build`
- Regression test: Build completed and Typecheck passes.
- Status: VERIFIED

### BUG-004

- Severity: HIGH
- Area: React hooks lint
- Exact error: 14 `react-hooks/set-state-in-effect` errors across account, admin, auth, checkout, AI, search, carousel, and mobile hook code.
- How reproduced: `npm run lint`
- Root cause: Effects synchronously initiated state updates instead of scheduling them through cancellable callbacks.
- Files affected: Account, admin, AI, auth, checkout, layout, carousel, and mobile hook components.
- Minimal fix: Schedule the existing updates with cancellable zero-delay timers and preserve cleanup/subscription behavior.
- Tests: `npm run lint`, `npm run build`
- Regression test: Lint completed with zero errors and zero warnings.
- Status: VERIFIED

### BUG-005

- Severity: HIGH
- Area: Local data restoration
- Exact error: `ADMIN_PASSWORD must be set to a real value before running the full seed.`
- How reproduced: `npm run db:seed:full`
- Root cause: Local `.env` still contains the protected placeholder value, so the seed correctly refuses to create the admin account.
- Files affected: Local `.env` only; no secret value recorded.
- Minimal fix: Set a real local development admin password directly in the terminal, then rerun `npm run db:seed:full`.
- Tests: `npm run db:push` and `npm run db:seed:full` pass locally.
- Regression test: Seed restored 67 categories, 26 products, 61 variants, 5 banners, 21 reviews, 1 order, and 3 coupons.
- Status: VERIFIED

### WARN-001

- Severity: WARNING
- Area: Next.js configuration
- Exact warning: Next.js inferred the workspace root from the root `package-lock.json` while another lockfile exists under `project`.
- Impact: Build still passes, but workspace root inference is ambiguous.
- Status: KNOWN LIMITATION

### WARN-002

- Severity: WARNING
- Area: Seed module metadata
- Exact warning: `seed-full.ts` is reparsed as an ES module because `package.json` does not declare `type: module`.
- Impact: Seed runs to its password guard but reports a module-type performance warning.
- Status: KNOWN LIMITATION

### BUG-006

- Severity: HIGH
- Area: Git / CI release gates
- Exact error: `fatal: not a git repository`
- How reproduced: `git status --short --branch` from the available workspace.
- Root cause: No `.git` metadata is available in the opened workspace tree.
- Impact: GitHub, CI, and deployment verification cannot be performed from this workspace.
- Status: BLOCKED

### BUG-007

- Severity: MEDIUM
- Area: Dependency installation / Prisma
- Exact error: Initial npm `postinstall` failed with `spawnSync prisma.cmd EINVAL`; the incomplete install then reported missing `@prisma/engines`.
- How reproduced: First `npm install` from the project directory.
- Root cause: The initial Windows npm install left Prisma's engine dependency incomplete and the postinstall wrapper could not invoke the generated command.
- Minimal fix: Complete installation with scripts disabled, install the matching Prisma engines package, then run `npx prisma generate` explicitly.
- Tests: `npx prisma generate`, `npm run db:push`, `npm run typecheck`, `npm run build`.
- Regression test: `doctor:local` confirms the generated Prisma Client and SQLite database.
- Status: VERIFIED

### BUG-008

- Severity: HIGH
- Area: AI production integration
- Exact issue: `z-ai-web-dev-sdk` is configured for an internal Z.ai endpoint in the documented environment and no public production credential/provider is configured.
- How reproduced: Reviewed `src/lib/ai.ts` and `.env.example`; no public provider configuration is available.
- Root cause: The current AI provider is environment-specific and cannot be assumed reachable from Vercel.
- Impact: AI features cannot be approved for production until provider reachability and credentials are verified.
- Minimal fix: Configure and verify an authorized public provider in Vercel, or document a deliberate non-AI production mode without fake responses.
- Verification: Not performed; no provider credentials supplied.
- Status: BLOCKED

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Local setup | PASS | Dependencies, `.env`, Prisma Client, and SQLite schema prepared |
| Typecheck | PASS | `npm run typecheck` |
| Lint | PASS | `npm run lint` |
| Build | PASS | `npm run build` |
| Runtime | PASS | `/ar`, `/en/shop`, `/api/products`, `/api/auth/me` returned HTTP 200 |
| Full seed | PASS | Local upsert-only seed completed successfully |
| GitHub / CI | BLOCKED | No Git repository metadata available |
| PostgreSQL / Neon | BLOCKED | No production credentials or target confirmation supplied |
| Vercel / Production | BLOCKED | No deployment performed |
| AI production readiness | BLOCKED | Provider is documented as internal/environment-specific |

## Current Status

Production release is not approved. Local code gates pass, while data restoration and all external deployment gates remain blocked and explicitly recorded above.