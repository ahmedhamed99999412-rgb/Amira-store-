import { setRequestLocale } from 'next-intl/server';
import { BannersManagerClient } from '@/components/admin/BannersManagerClient';

export default async function AdminBannersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BannersManagerClient locale={locale} />;
}
