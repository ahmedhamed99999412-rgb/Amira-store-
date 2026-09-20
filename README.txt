AMIRA STORE — BANNER IMAGE FIX (FINAL)

FIX-ONLY patch. This archive is NOT the full project.

It fixes two confirmed risks together:
1) Bumps hero/promo unstable_cache keys from v1 to v2 so stale banner records/IDs cannot be reused by the same cache key.
2) Replaces next/image rendering for Hero + Promo banners with direct /api/images URLs, avoiding the image optimizer path.
3) Keeps the updatedAt query-string cache buster.
4) Changes exactly these files: src/lib/queries.ts, src/components/home/HeroCarousel.tsx, src/components/home/PromoBanners.tsx
5) Does not touch Neon, Prisma schema, migrations, seeds, or data.

Apply from the project root:
  bash /path/to/Amira-store-BANNER-FIX/apply-fix.sh

Or specify the project path:
  bash /path/to/Amira-store-BANNER-FIX/apply-fix.sh /workspaces/Amira-store-

Then:
  git diff --check
  git diff -- src/lib/queries.ts src/components/home/HeroCarousel.tsx src/components/home/PromoBanners.tsx
  git add src/lib/queries.ts src/components/home/HeroCarousel.tsx src/components/home/PromoBanners.tsx
  git commit -m "Fix banner image loading and stale banner cache"
  git push origin main

Do not run any database migration/seed/reset command for this fix.
