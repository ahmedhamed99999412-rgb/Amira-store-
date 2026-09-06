import { setRequestLocale } from 'next-intl/server';
import { OrdersList } from '@/components/account/OrdersList';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrdersList locale={locale} />;
}
