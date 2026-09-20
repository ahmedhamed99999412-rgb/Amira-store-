# Amira Store — Stable Performance / Intermittent Homepage Fix

This package is a full source archive based on the available Amira Store production-ready archive, with the latest verified SSR fixes plus additional stability/performance repairs.

## Repairs included
- Removed duplicate direct SSR `ServerStateSync` rendering; `DeferredStoreRuntime` remains the client-only path.
- Fixed Next.js 16 `revalidateTag` calls.
- Corrected the Arabic fallback store name to `أميرة ستور` so a transient settings failure cannot show a different brand spelling.
- Added bounded DB query retries for transient Neon connection failures.
- Prevented homepage-critical `unstable_cache` entries from caching transient `[]`/fallback results.
- Raised public ISR/cache windows to 60 seconds and added targeted cache tags.
- Added admin cache invalidation for settings, categories, and banners.
- Added CDN/browser caching for DB-backed images and `nosniff`.
- Versioned banner image URLs from `updatedAt` so immutable image caching does not serve an edited banner forever.
- Switched homepage/storefront images to `next/image` with responsive sizing.
- Added the locale error boundary present in the current main branch.

## Safety
- No Neon migration, reset, seed, delete, truncate, or data mutation was performed while creating this archive.
- No secrets are included.

## Important
The available local archive was created before the latest GitHub commits, so this ZIP should be treated as a consolidated repair package, not a byte-for-byte export of the remote repository. Verify with CI/Vercel after replacing the repository contents.
