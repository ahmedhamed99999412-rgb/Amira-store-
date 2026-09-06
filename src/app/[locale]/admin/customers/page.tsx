import { setRequestLocale } from 'next-intl/server';
import { CustomersListClient } from '@/components/admin/CustomersListClient';

export default async function AdminCustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CustomersListClient locale={locale} />;
}
