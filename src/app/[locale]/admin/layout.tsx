import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Toaster } from '@/components/ui/sonner';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?from=/admin`);
  }
  if (user.role !== 'ADMIN') {
    redirect(`/${locale}`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <AdminSidebar locale={locale} />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      {/* Admin-specific Toaster to ensure toasts work in admin pages */}
      <Toaster position={locale === 'ar' ? 'bottom-left' : 'bottom-right'} richColors closeButton />
    </div>
  );
}
