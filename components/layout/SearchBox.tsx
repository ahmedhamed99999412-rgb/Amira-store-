'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Search, X, Sparkles, TrendingUp, Clock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

type ProductSuggestion = {
  id: string;
  slug: string;
  name: string;
  priceLabel: string;
  discount: number;
  inStock: boolean;
  image: string | null;
  category: string;
};

type CategorySuggestion = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
};

type SuggestResponse = {
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
  keywords: string[];
  trending: boolean;
};

const RECENT_KEY = 'amira:recent-searches';
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  try {
    const list = loadRecent().filter((x) => x !== q);
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {}
}

// Highlight matching substring inside text
function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-mauve/20 text-brand-charcoal font-semibold rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchBox({
  locale,
  variant = 'desktop',
}: {
  locale: string;
  variant?: 'desktop' | 'mobile';
}) {
  const t = useTranslations('search');
  const tHeader = useTranslations('header');
  const router = useRouter();
  const isRtl = locale === 'ar';

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const placeholder = variant === 'mobile' ? tHeader('searchPlaceholderShort') : tHeader('searchPlaceholder');

  // Load recent searches on mount + when dropdown opens
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRecent(loadRecent());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced fetch
  const fetchSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const trimmed = q.trim();
        if (trimmed.length < 2) {
          setData(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        const myReq = ++reqIdRef.current;
        try {
          const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}&locale=${locale}`);
          const json = (await res.json()) as SuggestResponse;
          // Only apply if this is the latest request
          if (myReq === reqIdRef.current) {
            setData(json);
          }
        } catch {
          if (myReq === reqIdRef.current) {
            setData({ products: [], categories: [], keywords: [], trending: false });
          }
        } finally {
          if (myReq === reqIdRef.current) setLoading(false);
        }
      }, 220);
    },
    [locale]
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    fetchSuggestions(val);
  }

  function onFocus() {
    setOpen(true);
    if (query.trim().length >= 2) fetchSuggestions(query);
  }

  function submitSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setRecent(loadRecent());
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitSearch(query);
  }

  function handleClearRecent(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    clearRecent();
    setRecent([]);
  }

  // Build a flat list of selectable items for keyboard navigation
  const flatItems: { type: 'product' | 'category' | 'keyword' | 'viewAll'; ref?: any }[] = [];
  if (open) {
    if (data && !data.trending) {
      data.keywords.slice(0, 3).forEach((k) => flatItems.push({ type: 'keyword', ref: k }));
      data.categories.forEach((c) => flatItems.push({ type: 'category', ref: c }));
      data.products.forEach((p) => flatItems.push({ type: 'product', ref: p }));
      if (data.products.length > 0 || data.categories.length > 0) {
        flatItems.push({ type: 'viewAll' });
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => (i + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item.type === 'keyword') submitSearch(item.ref as string);
        else if (item.type === 'category') {
          setOpen(false);
          router.push(`/category/${item.ref.slug}`);
        } else if (item.type === 'product') {
          setOpen(false);
          router.push(`/product/${item.ref.slug}`);
        } else if (item.type === 'viewAll') {
          submitSearch(query);
        }
      } else {
        // default submit handled by form
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Reset activeIndex when dropdown closes
  useEffect(() => {
    if (!open) {
      const timeoutId = window.setTimeout(() => setActiveIndex(-1), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [open]);

  const hasQuery = query.trim().length >= 2;
  const hasResults =
    !!data && !data.trending && (data.products.length > 0 || data.categories.length > 0);
  const showNoResults = !!data && !data.trending && !hasResults && hasQuery && !loading;

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative w-full">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-11 ps-4 pe-10 rounded-full bg-muted/70 border border-transparent focus:border-brand-mauve focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-mauve/20 text-sm transition-all"
        />
        <div className="absolute top-1/2 -translate-y-1/2 end-1.5 flex items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setData(null);
                inputRef.current?.focus();
              }}
              className="p-1.5 text-muted-foreground hover:text-brand-charcoal rounded-full hover:bg-muted transition-colors"
              aria-label="clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="p-2 rounded-full bg-brand-charcoal text-white hover:bg-brand-charcoal/90 transition-colors"
            aria-label={tHeader('searchPlaceholder')}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-border overflow-hidden"
          style={{
            insetInlineStart: 0,
            insetInlineEnd: 0,
          }}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('searching')}</span>
              </div>
            )}

            {/* Empty: show recent + trending */}
            {!loading && !hasQuery && (
              <div className="p-2">
                {recent.length > 0 && (
                  <Section
                    icon={<Clock className="h-3.5 w-3.5" />}
                    title={t('recentSearches')}
                    action={
                      <button
                        onClick={handleClearRecent}
                        className="text-[11px] text-muted-foreground hover:text-brand-mauve"
                      >
                        {t('clearRecent')}
                      </button>
                    }
                  >
                    <div className="flex flex-wrap gap-1.5 p-1">
                      {recent.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuery(r);
                            submitSearch(r);
                          }}
                          className="text-xs px-3 py-1.5 bg-muted hover:bg-brand-mauve hover:text-white rounded-full transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}
                {data?.trending && data.keywords.length > 0 && (
                  <Section icon={<TrendingUp className="h-3.5 w-3.5" />} title={t('trendingSearches')}>
                    <div className="flex flex-wrap gap-1.5 p-1">
                      {data.keywords.map((k, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuery(k);
                            submitSearch(k);
                          }}
                          className="text-xs px-3 py-1.5 bg-brand-cream hover:bg-brand-mauve hover:text-white rounded-full transition-colors flex items-center gap-1"
                        >
                          <TrendingUp className="h-3 w-3 opacity-60" />
                          {k}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}
                {/* Smart search CTA */}
                <div className="p-2">
                  <Link
                    href="/search"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-brand-mauve/10 to-brand-cream hover:from-brand-mauve/20 hover:to-brand-cream/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-full bg-brand-mauve/15 text-brand-mauve">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-charcoal">{t('smartSearch')}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {locale === 'ar' ? 'صِف اللي بتدور عليه بالعربي' : 'Describe what you need'}
                        </p>
                      </div>
                    </div>
                    <ArrowIcon className="h-4 w-4 text-brand-mauve opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && hasQuery && data && !data.trending && (
              <div className="p-2">
                {/* Categories */}
                {data.categories.length > 0 && (
                  <Section title={t('categories')}>
                    <div className="space-y-0.5">
                      {data.categories.map((c, idx) => {
                        const flatIdx = flatItems.findIndex(
                          (i) => i.type === 'category' && (i.ref as CategorySuggestion).id === c.id
                        );
                        return (
                          <Link
                            key={c.id}
                            href={`/category/${c.slug}`}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors ${
                              activeIndex === flatIdx ? 'bg-muted ring-1 ring-brand-mauve/30' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0">
                              {c.image ? (
                                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-mauve text-sm font-serif">
                                  {c.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-brand-charcoal flex-1">
                              {highlight(c.name, query)}
                            </span>
                            <ArrowIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Keywords */}
                {data.keywords.length > 0 && (
                  <Section title={t('suggestions')}>
                    <div className="flex flex-wrap gap-1.5 p-1">
                      {data.keywords.map((k, idx) => {
                        const flatIdx = flatItems.findIndex(
                          (i) => i.type === 'keyword' && i.ref === k
                        );
                        return (
                          <button
                            key={idx}
                            onClick={() => submitSearch(k)}
                            className={`text-xs px-3 py-1.5 bg-muted hover:bg-brand-mauve hover:text-white rounded-full transition-colors ${
                              activeIndex === flatIdx ? 'bg-brand-mauve text-white' : ''
                            }`}
                          >
                            {highlight(k, query)}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Products */}
                {data.products.length > 0 && (
                  <Section title={t('products')}>
                    <div className="space-y-0.5">
                      {data.products.map((p) => {
                        const flatIdx = flatItems.findIndex(
                          (i) => i.type === 'product' && (i.ref as ProductSuggestion).id === p.id
                        );
                        return (
                          <Link
                            key={p.id}
                            href={`/product/${p.slug}`}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors ${
                              activeIndex === flatIdx ? 'bg-muted ring-1 ring-brand-mauve/30' : ''
                            }`}
                          >
                            <div className="w-10 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-brand-charcoal line-clamp-1">
                                {highlight(p.name, query)}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-brand-charcoal">
                                  {p.priceLabel}
                                </span>
                                {p.discount > 0 && (
                                  <span className="text-[10px] bg-brand-mauve/15 text-brand-mauve px-1.5 py-0.5 rounded font-bold">
                                    -{p.discount}%
                                  </span>
                                )}
                                {!p.inStock && (
                                  <span className="text-[10px] text-red-500">{t('outOfStock')}</span>
                                )}
                              </div>
                            </div>
                            <ArrowIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* View all */}
                {(data.products.length > 0 || data.categories.length > 0) && (
                  <div className="p-1 pt-2 border-t border-border mt-1">
                    <button
                      onClick={() => submitSearch(query)}
                      className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-brand-charcoal text-white hover:bg-brand-charcoal/90 transition-colors text-sm font-medium ${
                        activeIndex === flatItems.length - 1 ? 'ring-2 ring-brand-mauve/40' : ''
                      }`}
                    >
                      <Search className="h-4 w-4" />
                      {t('viewAllResults', { count: data.products.length })}
                    </button>
                  </div>
                )}

                {/* No results */}
                {showNoResults && (
                  <div className="px-4 py-10 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-brand-charcoal">
                      {t('noResults', { query: query.trim() })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('noResultsHint')}</p>
                    <Link
                      href="/search"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-brand-mauve hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('smartSearch')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
