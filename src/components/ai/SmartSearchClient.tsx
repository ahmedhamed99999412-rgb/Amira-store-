'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Search } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';

const SUGGESTIONS_AR = ['عايز فستان للفرح', 'حذاء رياضي مريح', 'عطر هدية لأمي', 'منتجات العناية بالبشرة الجافة', 'ملابس شتاء للرجال'];
const SUGGESTIONS_EN = ['I want a dress for a wedding', 'Comfortable sneakers', 'Perfume gift for my mom', 'Skincare for dry skin', 'Winter clothes for men'];

export function SmartSearchClient({ locale }: { locale: string }) {
  const t = useTranslations('ai');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [explanation, setExplanation] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSearch(q?: string) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch('/api/search/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.products || []);
        setExplanation(data.analysis?.explanation || '');
      }
    } catch {} finally { setLoading(false); }
  }

  const suggestions = locale === 'ar' ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-brand-mauve/10 text-brand-mauve px-4 py-1 rounded-full text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3" />
          {locale === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-brand-charcoal mb-3">{t('searchTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {locale === 'ar' ? 'صف ما تبحث عنه باللغة الطبيعية، والذكاء الاصطناعي هيلاقي المنتجات المناسبة' : 'Describe what you\'re looking for in natural language, and AI will find matching products'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-5 w-5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={t('searchPlaceholder')} className="h-12 ps-11 text-base" />
          </div>
          <Button onClick={() => handleSearch()} disabled={loading || !query.trim()} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none h-12 px-6">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (locale === 'ar' ? 'بحث' : 'Search')}
          </Button>
        </div>

        {!searched && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">{locale === 'ar' ? 'جرّب:' : 'Try:'}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button key={idx} onClick={() => handleSearch(s)} className="text-xs px-3 py-1.5 bg-muted hover:bg-brand-mauve hover:text-white rounded-full transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {explanation && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-brand-cream rounded-lg border border-brand-mauve/20">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-brand-mauve mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{explanation}</p>
          </div>
        </div>
      )}

      {searched && !loading && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-16"><p className="text-muted-foreground">{locale === 'ar' ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}</p></div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4 text-center">{results.length} {locale === 'ar' ? 'نتيجة' : 'results'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                {results.map((p) => (<ProductCard key={p.id} product={p} locale={locale} />))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
