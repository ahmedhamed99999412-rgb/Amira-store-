import { setRequestLocale } from 'next-intl/server';
import { SettingsManager } from '@/components/account/SettingsManager';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsManager locale={locale} />;
}
