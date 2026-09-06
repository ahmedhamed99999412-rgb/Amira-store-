'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type Customer = {
  id: string;
  username: string;
  phone: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
};

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CustomersListClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.username, c.phone, c.fullName || ''].some((f) =>
      f.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
          {t('customers')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'ar'
            ? `${customers.length} عميل مسجل`
            : `${customers.length} registered customers`}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'ar' ? 'ابحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
          className="ps-9 h-10"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t('noCustomers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-start">
                  <th className="text-start font-medium px-4 py-3">{t('customerName')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('username')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('phone')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('ordersCount')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('totalSpent')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('joinDate')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-mauve text-white flex items-center justify-center text-sm font-bold">
                          {(c.fullName || c.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-brand-charcoal">
                            {c.fullName || c.username}
                          </div>
                          {!c.isActive && (
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                              {t('inactive')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs" dir="ltr">
                      @{c.username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{formatNumber(c.ordersCount, locale)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-charcoal">
                      {formatPrice(c.totalSpent, locale)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(c.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
