AMIRA STORE — Corrected Banner Image Fix

IMPORTANT:
This is a SMALL SOURCE PATCH, not a full-project replacement ZIP.
Do NOT upload this ZIP as the whole repository.

Apply it from the root of the existing Amira-store repository in Codespaces:

  unzip -q /path/to/Amira-store-BANNER-IMAGE-FIX-CORRECTED.zip -d /tmp/amira-banner-fix
  python3 /tmp/amira-banner-fix/banner-fix/fix-banner-images.py

The script automatically finds the Git repository root by walking upward from
whatever directory you run it from. It updates ONLY:

  src/components/home/HeroCarousel.tsx
  src/components/home/PromoBanners.tsx

What it changes:
- replaces the homepage Hero/Promo next/image rendering with direct <img>
- keeps the existing /api/images/<id>?v=<updatedAt> URL
- adds async image decoding
- keeps eager loading for the first hero and lazy loading for the rest
- makes no database changes

Then verify:

  git diff --check
  git diff -- src/components/home/HeroCarousel.tsx src/components/home/PromoBanners.tsx

Then commit and push:

  git add src/components/home/HeroCarousel.tsx src/components/home/PromoBanners.tsx
  git commit -m "Fix homepage banner image rendering"
  git push origin main

Do NOT run:
- prisma migrate
- prisma db push
- db:seed
- db:reset
- any Neon data write
