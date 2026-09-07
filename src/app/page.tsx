import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

// Root page redirects to default locale (/ar)
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
