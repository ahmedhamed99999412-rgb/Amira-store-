import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

// Root page redirects to default locale (/ar)
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
