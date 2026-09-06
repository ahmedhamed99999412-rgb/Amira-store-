'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

export function PaginationWrapper({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.startsWith('/ar') ? 'ar' : 'en';

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    router.push(buildPageUrl(page));
  }

  // Build page numbers to show (current ± 2, with first/last always shown)
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-2 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        {locale === 'ar' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={buildPageUrl(page)}
            className={`min-w-[36px] h-9 px-2 rounded border text-sm font-medium flex items-center justify-center transition-colors ${
              page === currentPage
                ? 'bg-brand-charcoal text-white border-brand-charcoal'
                : 'border-border hover:bg-muted'
            }`}
          >
            {page}
          </Link>
        )
      )}

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-2 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        {locale === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </nav>
  );
}
