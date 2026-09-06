import { setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Aggregate statistics from DB
  const [ordersCount, productsCount, customersCount, revenueAgg, recentOrders, lowStockVariants] =
    await Promise.all([
      db.order.count(),
      db.product.count({ where: { isDeleted: false } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      db.productVariant.findMany({
        where: { stock: { lt: 5 }, product: { isDeleted: false } },
        take: 10,
        include: {
          product: {
            include: {
              translations: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
        },
      }),
    ]);

  // Build 7-day revenue series
  const days: { date: string; label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const aggr = await db.order.aggregate({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: day, lt: next },
      },
      _sum: { total: true },
    });
    days.push({
      date: day.toISOString(),
      label: day.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
      }),
      revenue: aggr._sum.total || 0,
    });
  }

  const recent = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.guestName,
    phone: o.guestPhone,
    governorate: o.governorate,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    itemCount: o.items.length,
  }));

  const lowStock = lowStockVariants.map((v) => ({
    id: v.id,
    stock: v.stock,
    size: v.size || '',
    color: v.color || '',
    productNameAr:
      v.product.translations.find((t) => t.locale === 'ar')?.name || '',
    productNameEn:
      v.product.translations.find((t) => t.locale === 'en')?.name || '',
    productSlug: v.product.slug,
    image: v.product.images[0]
      ? `/api/images/${v.product.images[0].id}`
      : null,
  }));

  return (
    <AdminDashboardClient
      stats={{
        totalSales: revenueAgg._sum.total || 0,
        totalOrders: ordersCount,
        totalProducts: productsCount,
        totalCustomers: customersCount,
      }}
      revenueSeries={days}
      recentOrders={recent}
      lowStock={lowStock}
      locale={locale}
    />
  );
}
