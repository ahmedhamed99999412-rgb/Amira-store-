import { setRequestLocale } from 'next-intl/server';
import { SettingsManagerClient } from '@/components/admin/SettingsManagerClient';

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsManagerClient locale={locale} />;
}
