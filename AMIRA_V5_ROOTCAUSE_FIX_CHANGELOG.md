# Amira Store — V5 root-cause fix

## Scope

This patch is limited to the reported wishlist instability, false out-of-stock display, global request overhead, and the CI lint failure exposed after V4.

## Root causes fixed

1. Wishlist optimistic state could be overwritten by an older in-flight server sync. A mutation-version guard now rejects any sync snapshot that started before a newer local wishlist mutation.
2. ProductCard previously sent only a minimal wishlist snapshot. After refresh, the persisted wishlist item could lack stock metadata; that missing value was previously converted to `0`, producing a false "out of stock" label. ProductCard now saves the available product metadata, and unknown stock is never treated as zero.
3. Wishlist page now refreshes the authoritative server wishlist once after hydration, so current stock/price metadata is restored without per-product request waterfalls.
4. Cart sync receives the same stale-response protection so a background sync cannot roll back a newer cart action.
5. Image lookup now uses one parameterized SQL round trip instead of three sequential/parallel table lookups while preserving the same image URL contract.
6. AuthProvider mount refresh is deferred through a timer so ESLint's react-hooks/set-state-in-effect rule is satisfied without changing authentication behavior.

## Data safety

- No database migration.
- No products, categories, category relationships, orders, customers, users, prices, inventory rows, or AI data changed.
- No reset, truncate, seed, mass update, or destructive operation.

## Validation

- Changed files are limited to the six source files required by the fixes.
- TypeScript logic was checked statically.
- The GitHub failure supplied by the user is addressed at AuthProvider.tsx: the direct effect call is replaced by a deferred refresh.
- Full lint/build must be confirmed by CI/Vercel after deployment; this environment does not contain node_modules for a faithful project lint run.

## Production status

NOT production-verified. Do not mark RELEASE READY until CI/Vercel build passes and Production is visually tested for wishlist add/remove, refresh persistence, correct stock labels, and repeated rapid heart clicks.
