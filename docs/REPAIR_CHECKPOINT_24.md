# Repair Checkpoint 24

## Scope
Login API internal error sanitization only.

## Change
`src/app/api/auth/login/route.ts`
- Catch type changed from `any` to `unknown`.
- Unexpected 500 responses now return a generic `Login failed` message instead of exposing `error.message`.
- Existing 400/401/403 business messages remain unchanged.

## Verification
- No remaining raw `error.message` usage in 500 response paths across `src/app/api`.
- `auth/login/route.ts` parses structurally.
- Database remains unchanged.
