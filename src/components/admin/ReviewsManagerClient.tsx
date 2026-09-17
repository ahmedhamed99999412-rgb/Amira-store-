'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Check, EyeOff, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type Review = {
  id: string;
  productSlug: string;
  productNameAr: string;
  productNameEn: string;
  username: string | null;
  userPhone: string | null;
  guestName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
};

type StatusFilter = 'pending' | 'approved' | 'all';

export function ReviewsManagerClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () => locale === 'ar'
      ? {
          title: 'التقييمات',
          subtitle: 'مراجعة واعتماد تقييمات العملاء قبل نشرها',
          pending: 'قيد المراجعة',
          approved: 'معتمدة',
          all: 'الكل',
          approve: 'اعتماد',
          hide: 'إخفاء',
          remove: 'حذف نهائي',
          empty: 'لا توجد تقييمات في هذه القائمة',
          error: 'تعذر تحميل التقييمات',
          failedAction: 'تعذر تنفيذ العملية',
          confirmDelete: 'هل تريد حذف هذا التقييم نهائيًا؟',
          unknownProduct: 'منتج',
        }
      : {
          title: 'Reviews',
          subtitle: 'Review and approve customer reviews before publishing',
          pending: 'Pending',
          approved: 'Approved',
          all: 'All',
          approve: 'Approve',
          hide: 'Hide',
          remove: 'Delete permanently',
          empty: 'No reviews in this list',
          error: 'Could not load reviews',
          failedAction: 'Could not complete the action',
          confirmDelete: 'Delete this review permanently?',
          unknownProduct: 'Product',
        },
    [locale]
  );

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews?status=${filter}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { reviews?: Review[]; error?: string };
      if (!response.ok) throw new Error(data.error || labels.error);
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  }, [filter, labels.error]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReviews();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReviews]);

  async function moderate(id: string, isApproved: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isApproved }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || labels.failedAction);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failedAction);
    } finally {
      setBusyId(null);
    }
  }

  async function removeReview(id: string) {
    if (!window.confirm(labels.confirmDelete)) return;
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || labels.failedAction);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failedAction);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-brand-charcoal">{labels.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{labels.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['pending', labels.pending],
          ['approved', labels.approved],
          ['all', labels.all],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
            className={filter === value ? 'bg-brand-charcoal text-white' : ''}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-muted-foreground">
          {labels.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const productName = locale === 'ar' ? review.productNameAr : review.productNameEn;
            return (
              <article key={review.id} className="rounded-lg border border-border bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-medium text-brand-charcoal truncate">{productName || labels.unknownProduct}</h2>
                      <span className="text-xs text-muted-foreground">/{review.productSlug}</span>
                    </div>
                    <div className="flex items-center gap-1" aria-label={`${review.rating}/5`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ms-1">{review.rating}/5</span>
                    </div>
                    <p className="text-sm font-medium text-brand-charcoal">{review.title || (locale === 'ar' ? 'بدون عنوان' : 'No title')}</p>
                    <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{review.comment || '—'}</p>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span>{review.guestName}</span>
                      {review.userPhone && <span dir="ltr">{review.userPhone}</span>}
                      <span dir="ltr">{new Date(review.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!review.isApproved && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => moderate(review.id, true)}
                        disabled={busyId === review.id}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {busyId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span>{labels.approve}</span>
                      </Button>
                    )}
                    {review.isApproved && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moderate(review.id, false)}
                        disabled={busyId === review.id}
                      >
                        {busyId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                        <span>{labels.hide}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeReview(review.id)}
                      disabled={busyId === review.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {busyId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span>{labels.remove}</span>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
