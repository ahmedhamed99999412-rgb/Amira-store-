#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$PROJECT_ROOT" ]]; then
  echo "ERROR: Run this from inside the existing Amira-store Git repository."
  exit 1
fi

QUERIES="$PROJECT_ROOT/src/lib/queries.ts"
if [[ ! -f "$QUERIES" ]]; then
  echo "ERROR: Missing $QUERIES"
  exit 1
fi

export QUERIES
python3 - <<'PY'
from pathlib import Path
import os

path = Path(os.environ['QUERIES'])
s = path.read_text(encoding='utf-8')

replacements = [
    (
        "['amira-hero-banners-v1'],\n  { revalidate: 60 }",
        "['amira-hero-banners-v2'],\n  { revalidate: 60, tags: ['amira-hero-banners'] }",
    ),
    (
        "['amira-promo-banners-v1'],\n  { revalidate: 60 }",
        "['amira-promo-banners-v2'],\n  { revalidate: 60, tags: ['amira-promo-banners'] }",
    ),
]

for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'ERROR: Expected exactly 1 match, found {count}: {old}')
    s = s.replace(old, new, 1)

assert "['amira-hero-banners-v2']" in s
assert "['amira-promo-banners-v2']" in s
assert "tags: ['amira-hero-banners']" in s
assert "tags: ['amira-promo-banners']" in s
assert "['amira-hero-banners-v1']" not in s
assert "['amira-promo-banners-v1']" not in s

path.write_text(s, encoding='utf-8')
print('BANNER CACHE FIX APPLIED SUCCESSFULLY')
print('Updated: src/lib/queries.ts')
PY

git -C "$PROJECT_ROOT" diff --check

echo
echo "Changed lines:"
git -C "$PROJECT_ROOT" diff -- src/lib/queries.ts
