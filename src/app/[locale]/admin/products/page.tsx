import { setRequestLocale } from 'next-intl/server';
import { ProductsListClient } from '@/components/admin/ProductsListClient';

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProductsListClient locale={locale} />;
}
