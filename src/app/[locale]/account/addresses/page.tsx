import { setRequestLocale } from 'next-intl/server';
import { AddressesManager } from '@/components/account/AddressesManager';

export default async function AddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AddressesManager locale={locale} />;
}
