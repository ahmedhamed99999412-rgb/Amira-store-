AMIRA STORE — FINAL BANNER CACHE FIX

This is a FIX-ONLY package. It is NOT the full project.

ROOT CAUSE CONFIRMED:
The admin banner API invalidates these cache tags:
  amira-hero-banners
  amira-promo-banners

But the cached homepage banner queries were not tagged with those tags.
The same cache key could therefore keep old banner records/IDs, while the
current Neon database contains newer banner IDs. The old image IDs then return
404 from /api/images/[id].

THIS FIX:
- bumps the hero/promo cache keys from v1 to v2 (one-time stale-cache escape)
- attaches the matching cache tags so future admin banner changes invalidate
  the cached queries correctly
- changes ONLY src/lib/queries.ts
- makes NO Neon/Prisma/database changes

HOW TO APPLY IN CODESPACES:
1. Upload this ZIP into the existing /workspaces/Amira-store- project.
2. Open the terminal at the project root.
3. Run:

   unzip -q Amira-store-BANNER-CACHE-FIX-FINAL.zip -d /tmp/amira-banner-fix-final
   bash /tmp/amira-banner-fix-final/apply-banner-fix.sh

4. Confirm the diff is only src/lib/queries.ts.
5. Commit and push:

   git add src/lib/queries.ts
   git commit -m "Fix banner cache invalidation"
   git push origin main

DO NOT run Prisma migrations, db push, seed, reset, or any Neon write.

IMPORTANT:
Do not use GitHub's "Add files" page to upload the ZIP as a repository file.
The ZIP must be extracted in the existing project so the script edits the real
src/lib/queries.ts file.
