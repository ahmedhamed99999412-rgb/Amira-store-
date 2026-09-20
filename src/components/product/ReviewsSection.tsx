'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Star } from 'lucide-react';

type Review = {
  id: string;
  guestName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date;
};

export function ReviewsSection({
  productId,
  reviews,
  avgRating,
  reviewCount,
  locale,
}: {
  productId: string;
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
  locale: string;
}) {
  const t = useTranslations('product');
  const tCommon = useTranslations('common');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', rating: 5, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [localReviews, setLocalReviews] = useState<Review[]>(reviews);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) {
      toast.error(t('reviewFormRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tCommon('error'));
        return;
      }
      toast.success(t('writeReview'));
      const newReview: Review = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      setLocalReviews((prev) => [newReview, ...prev]);
      setShowForm(false);
      setForm({ name: '', rating: 5, comment: '' });
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  return (
    <div className="space-y-6">
      {/* Reviews summary */}
      <div className="flex items-center gap-6 pb-6 border-b border-border">
        <div className="text-center">
          <div className="text-4xl font-bold text-brand-charcoal">
            {reviewCount > 0 ? avgRating.toFixed(1) : '—'}
          </div>
            <div className="flex items-center justify-center mt-1" role="img" aria-label={`${reviewCount > 0 ? Math.round(avgRating) : 0} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          <p className="text-xs text-muted-foreground mt-1">
            {reviewCount} {t('reviewsCount')}
          </p>
        </div>
        <div className="flex-1">
          <Button
            onClick={() => setShowForm((p) => !p)}
            variant="outline"
            className="rounded-none border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white"
          >
            {t('writeReview')}
          </Button>
        </div>
      </div>

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="review-name">{t('name')} *</Label>
            <Input
              id="review-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('reviews')} *</Label>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={form.rating === star}
                onClick={() => setForm({ ...form, rating: star })}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setForm((f) => ({ ...f, rating: Math.min(5, f.rating + 1) }));
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setForm((f) => ({ ...f, rating: Math.max(1, f.rating - 1) }));
                  }
                }}
                className="p-1"
                aria-label={`${star} ${t('stars')}`}
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    star <= (hoverRating || form.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-comment">{t('comment')} *</Label>
              <Textarea
                id="review-comment"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                required
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.comment.length}/1000
              </p>
          </div>
          <Button type="submit" disabled={submitting} className="rounded-none bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('writeReview')}
          </Button>
        </form>
      )}

      {/* Reviews list */}
      {localReviews.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">{t('noReviews')}</p>
      ) : (
        <div className="space-y-6">
          {localReviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-mauve text-white flex items-center justify-center text-xs font-bold">
                    {review.guestName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-brand-charcoal">{review.guestName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
