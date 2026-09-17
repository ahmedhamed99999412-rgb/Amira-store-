import { setRequestLocale } from 'next-intl/server';
import { OrdersManagerClient } from '@/components/admin/OrdersManagerClient';

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrdersManagerClient locale={locale} />;
}
