# Amira V8 follow-up — Header TypeScript fix

Root cause from Vercel/GitHub:
- `src/components/layout/Header.tsx` uses `useEffect` for locale prefetching but did not import it.
- TypeScript failed with `TS2304: Cannot find name 'useEffect'`.

Scope:
- Added `useEffect` to the existing React import in `Header.tsx`.
- No other source files changed.
- No database, Prisma, products, categories, orders, wishlist data, or configuration changes.

This is a minimal follow-up patch for the exact CI/Vercel failure on commit `8fe0891`.
