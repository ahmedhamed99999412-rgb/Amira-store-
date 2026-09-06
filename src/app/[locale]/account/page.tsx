import { setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { AccountDashboard } from '@/components/account/AccountDashboard';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AccountDashboard
        stats={{ ordersCount: 0, addressesCount: 0, totalSpent: 0 }}
        locale={locale}
      />
    );
  }

  // Fetch user stats
  const [ordersCount, addressesCount] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.address.count({ where: { userId: user.id } }),
  ]);

  const totalSpent = await db.order.aggregate({
    where: { userId: user.id, status: { not: 'CANCELLED' } },
    _sum: { total: true },
  });

  return (
    <AccountDashboard
      stats={{
        ordersCount,
        addressesCount,
        totalSpent: totalSpent._sum.total || 0,
      }}
      locale={locale}
    />
  );
}
