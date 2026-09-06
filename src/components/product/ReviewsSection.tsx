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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', rating: 5, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) {
      toast.error(locale === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
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
        toast.error(data.error || 'Failed to submit review');
        return;
      }
      toast.success(t('writeReview'));
      setShowForm(false);
      setForm({ name: '', rating: 5, comment: '' });
    } catch {
      toast.error('Failed to submit review');
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
          <div className="flex items-center justify-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                }`}
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
            <Label htmlFor="review-name">{locale === 'ar' ? 'الاسم' : 'Name'} *</Label>
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
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1"
                  aria-label={`${star} stars`}
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
            <Label htmlFor="review-comment">{locale === 'ar' ? 'التعليق' : 'Comment'} *</Label>
            <Textarea
              id="review-comment"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              required
              rows={4}
            />
          </div>
          <Button type="submit" disabled={submitting} className="rounded-none bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('writeReview')}
          </Button>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">{t('noReviews')}</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
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
