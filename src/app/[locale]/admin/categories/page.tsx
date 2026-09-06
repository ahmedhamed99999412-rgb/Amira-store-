import { setRequestLocale } from 'next-intl/server';
import { CategoriesManagerClient } from '@/components/admin/CategoriesManagerClient';

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CategoriesManagerClient locale={locale} />;
}
