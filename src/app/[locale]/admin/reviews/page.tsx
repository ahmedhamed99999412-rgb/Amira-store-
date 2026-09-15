import { setRequestLocale } from 'next-intl/server';
import { ReviewsManagerClient } from '@/components/admin/ReviewsManagerClient';

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReviewsManagerClient locale={locale} />;
}
