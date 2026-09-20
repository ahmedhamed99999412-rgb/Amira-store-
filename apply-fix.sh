#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-}"
if [[ -z "$PROJECT_ROOT" ]]; then
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    PROJECT_ROOT="$(git rev-parse --show-toplevel)"
  else
    echo "ERROR: Run this script from the project root or pass the project path as the first argument."
    exit 1
  fi
fi

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "ERROR: Project directory not found: $PROJECT_ROOT"
  exit 1
fi

export PROJECT_ROOT
python3 - <<'PYINNER'
from pathlib import Path
import os, re, sys

root = Path(os.environ['PROJECT_ROOT']).resolve()
paths = {
    'queries': root / 'src/lib/queries.ts',
    'hero': root / 'src/components/home/HeroCarousel.tsx',
    'promo': root / 'src/components/home/PromoBanners.tsx',
}
for name, path in paths.items():
    if not path.is_file():
        raise SystemExit(f'ERROR: Missing expected file: {path}')

q = paths['queries'].read_text(encoding='utf-8')
hero = paths['hero'].read_text(encoding='utf-8')
promo = paths['promo'].read_text(encoding='utf-8')

for old, new in [
    ("['amira-hero-banners-v1']", "['amira-hero-banners-v2']"),
    ("['amira-promo-banners-v1']", "['amira-promo-banners-v2']"),
]:
    count = q.count(old)
    if count != 1:
        raise SystemExit(f'ERROR: Expected exactly 1 occurrence of {old}, found {count}')
    q = q.replace(old, new, 1)

if "import Image from 'next/image';" not in hero:
    raise SystemExit("ERROR: HeroCarousel.tsx expected next/image import was not found")
hero = hero.replace("import Image from 'next/image';\n", '', 1)
hero_pattern = re.compile(
    r"\s*<Image\s+"
    r"src=\{`/api/images/\$\{banner\.id\}\?v=\$\{banner\.updatedAt instanceof Date \? banner\.updatedAt\.getTime\(\) : new Date\(banner\.updatedAt \|\| 0\)\.getTime\(\)\}`\}\s+"
    r"alt=\{title \|\| ''\}\s+fill\s+priority=\{idx === 0\}\s+sizes=\"100vw\"\s+className=\"object-cover\"\s*/>",
    re.S,
)
hero_replacement = """\n                <img\n                  src={`/api/images/${banner.id}?v=${banner.updatedAt instanceof Date ? banner.updatedAt.getTime() : new Date(banner.updatedAt || 0).getTime()}`}\n                  alt={title || ''}\n                  loading={idx === 0 ? 'eager' : 'lazy'}\n                  className=\"w-full h-full object-cover\"\n                />"""
hero, n = hero_pattern.subn(hero_replacement, hero, count=1)
if n != 1:
    raise SystemExit(f'ERROR: Expected exactly 1 Hero <Image> block, replaced {n}')

if "import Image from 'next/image';" not in promo:
    raise SystemExit("ERROR: PromoBanners.tsx expected next/image import was not found")
promo = promo.replace("import Image from 'next/image';\n", '', 1)
promo_pattern = re.compile(
    r"\s*<Image\s+"
    r"src=\{`/api/images/\$\{banner\.id\}\?v=\$\{banner\.updatedAt instanceof Date \? banner\.updatedAt\.getTime\(\) : new Date\(banner\.updatedAt \|\| 0\)\.getTime\(\)\}`\}\s+"
    r"alt=\{title \|\| ''\}\s+fill\s+sizes=\"\(max-width: 767px\) 100vw, 50vw\"\s+className=\"object-cover group-hover:scale-105 transition-transform duration-700\"\s*/>",
    re.S,
)
promo_replacement = """\n                <img\n                  src={`/api/images/${banner.id}?v=${banner.updatedAt instanceof Date ? banner.updatedAt.getTime() : new Date(banner.updatedAt || 0).getTime()}`}\n                  alt={title || ''}\n                  loading=\"lazy\"\n                  className=\"absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700\"\n                />"""
promo, n = promo_pattern.subn(promo_replacement, promo, count=1)
if n != 1:
    raise SystemExit(f'ERROR: Expected exactly 1 Promo <Image> block, replaced {n}')

assert "['amira-hero-banners-v2']" in q and "['amira-promo-banners-v2']" in q
assert "['amira-hero-banners-v1']" not in q and "['amira-promo-banners-v1']" not in q
assert "<Image" not in hero and "from 'next/image'" not in hero and '<img' in hero
assert "<Image" not in promo and "from 'next/image'" not in promo and '<img' in promo

paths['queries'].write_text(q, encoding='utf-8')
paths['hero'].write_text(hero, encoding='utf-8')
paths['promo'].write_text(promo, encoding='utf-8')
print('PATCH APPLIED SUCCESSFULLY')
for p in paths.values():
    print('  ' + str(p.relative_to(root)))
PYINNER

if git -C "$PROJECT_ROOT" diff --check; then
  echo "git diff --check: OK"
fi

git -C "$PROJECT_ROOT" diff -- src/lib/queries.ts src/components/home/HeroCarousel.tsx src/components/home/PromoBanners.tsx
