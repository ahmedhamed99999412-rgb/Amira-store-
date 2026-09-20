from pathlib import Path
import re


def find_repo_root() -> Path:
    current = Path.cwd().resolve()
    for candidate in (current, *current.parents):
        if (candidate / '.git').exists():
            return candidate
    raise SystemExit(
        'ERROR: Git repository root not found. Run this script from inside the Amira-store repository.'
    )


ROOT = find_repo_root()

FILES = {
    ROOT / 'src/components/home/HeroCarousel.tsx': (
        re.compile(
            r'<Image\s+src=\{`/api/images/\$\{banner\.id\}\?v=\$\{banner\.updatedAt instanceof Date \? banner\.updatedAt\.getTime\(\) : new Date\(banner\.updatedAt \|\| 0\)\.getTime\(\)\}`\}\s+alt=\{title \|\| \'\'\}\s+fill\s+priority=\{idx === 0\}\s+sizes="100vw"\s+className="object-cover"\s+/>',
            re.S,
        ),
        '''<img
                  src={`/api/images/${banner.id}?v=${banner.updatedAt instanceof Date ? banner.updatedAt.getTime() : new Date(banner.updatedAt || 0).getTime()}`}
                  alt={title || ''}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-full object-cover"
                />''',
    ),
    ROOT / 'src/components/home/PromoBanners.tsx': (
        re.compile(
            r'<Image\s+src=\{`/api/images/\$\{banner\.id\}\?v=\$\{banner\.updatedAt instanceof Date \? banner\.updatedAt\.getTime\(\) : new Date\(banner\.updatedAt \|\| 0\)\.getTime\(\)\}`\}\s+alt=\{title \|\| \'\'\}\s+fill\s+sizes="\(max-width: 767px\) 100vw, 50vw"\s+className="object-cover group-hover:scale-105 transition-transform duration-700"\s+/>',
            re.S,
        ),
        '''<img
                  src={`/api/images/${banner.id}?v=${banner.updatedAt instanceof Date ? banner.updatedAt.getTime() : new Date(banner.updatedAt || 0).getTime()}`}
                  alt={title || ''}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />''',
    ),
}

changed = []
for path, (pattern, replacement) in FILES.items():
    if not path.exists():
        raise SystemExit(f'MISSING: {path}')
    original = path.read_text(encoding='utf-8')
    if "import Image from 'next/image';" not in original:
        raise SystemExit(f'EXPECTED next/image import not found in {path}')
    updated, replacements = pattern.subn(replacement, original, count=1)
    if replacements != 1:
        raise SystemExit(f'EXPECTED banner <Image> block not found exactly once in {path}')
    updated = updated.replace("import Image from 'next/image';\n", "", 1)
    path.write_text(updated, encoding='utf-8')
    changed.append(path.relative_to(ROOT))

print(f'Repository root: {ROOT}')
print('Applied banner image rendering fix:')
for p in changed:
    print(f'  - {p}')
print('The ?v=updatedAt cache-busting query is preserved.')
