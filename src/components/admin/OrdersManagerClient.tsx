'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Loader2,
  ShoppingBag,
  Eye,
  Filter,
  Save,
  Phone,
  MapPin,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type OrderRow = {
  id: string;
  orderNumber: string;
  guestName: string;
  guestPhone: string;
  governorate: string;
  city: string;
  total: number;
  status: string;
  shippingStatus: string;
  shippingCost: number | null;
  subtotal: number;
  itemCount: number;
  createdAt: string;
  userId: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  guestName: string;
  guestPhone: string;
  guestAddress: string;
  governorate: string;
  city: string;
  landmarks: string | null;
  guestNotes: string | null;
  subtotal: number;
  shippingCost: number | null;
  shippingStatus: string;
  discount: number;
  couponCode: string | null;
  total: number;
  status: string;
  createdAt: string;
  user: { id: string; username: string; fullName: string | null; phone: string } | null;
  items: Array<{
    id: string;
    productNameAr: string;
    productNameEn: string;
    productSku: string;
    productPrice: number;
    quantity: number;
    productImage: string;
  }>;
};

const STATUSES = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
];

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabelKey(status: string): string {
  switch (status) {
    case 'PENDING_CONFIRMATION':
      return 'pendingConfirmation';
    case 'CONFIRMED':
      return 'confirmed';
    case 'SHIPPING':
      return 'shipping';
    case 'DELIVERED':
      return 'delivered';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pendingConfirmation';
  }
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DELIVERED':
      return 'default';
    case 'CONFIRMED':
      return 'secondary';
    case 'SHIPPING':
      return 'outline';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function OrdersManagerClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'ALL' ? `/api/admin/orders?status=${statusFilter}` : '/api/admin/orders';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, locale]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const stats = useMemo(() => {
    const total = orders.length;
    const byStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length;
      return acc;
    }, {});
    return { total, ...byStatus };
  }, [orders]);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const o = data.order as OrderDetail;
      setDetail(o);
      setNewStatus(o.status);
      setShippingCost(o.shippingCost != null ? String(o.shippingCost) : '');
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل التفاصيل' : 'Failed to load details');
      setDetailId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleUpdate() {
    if (!detail) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (shippingCost !== '') {
        payload.shippingCost = shippingCost;
      }
      const res = await fetch(`/api/admin/orders/${detail.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(t('orderUpdated'));
      setDetailId(null);
      load();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
            {t('orders')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'ar'
              ? `${stats.total} طلب`
              : `${stats.total} orders`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('all')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(statusLabelKey(s))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <Card key={s} className="p-3">
            <div className="text-xs text-muted-foreground">{t(statusLabelKey(s))}</div>
            <div className="text-xl font-bold text-brand-charcoal mt-1">{formatNumber(stats[s], locale)}</div>
          </Card>
        ))}
      </div>

      {/* Orders table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t('noOrders')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-start">
                  <th className="text-start font-medium px-4 py-3">{t('orderNumber')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('customer')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('phone')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('governorate')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('total')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('status')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden sm:table-cell">{t('date')}</th>
                  <th className="text-end font-medium px-4 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium text-brand-charcoal text-xs" dir="ltr">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-charcoal">{o.guestName}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.itemCount} {t('items')}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground" dir="ltr">
                      {o.guestPhone}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {o.governorate}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-charcoal">
                      {formatPrice(o.total, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(o.status)}>
                        {t(statusLabelKey(o.status))}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDate(o.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDetail(o.id)}
                        aria-label={t('orderDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('orderDetails')}{' '}
              {detail && (
                <span className="font-mono text-sm text-muted-foreground" dir="ltr">
                  {detail.orderNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('customerName')}:</span>
                  <span className="font-medium text-brand-charcoal">{detail.guestName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('phone')}:</span>
                  <span className="font-medium text-brand-charcoal" dir="ltr">{detail.guestPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('address')}:</span>
                  <span className="font-medium text-brand-charcoal">
                    {detail.governorate}, {detail.city} - {detail.guestAddress}
                  </span>
                </div>
                {detail.landmarks && (
                  <div className="text-sm sm:col-span-2">
                    <span className="text-muted-foreground">{t('notes')}:</span>{' '}
                    {detail.landmarks}
                  </div>
                )}
                {detail.guestNotes && (
                  <div className="text-sm sm:col-span-2">
                    <span className="text-muted-foreground">{t('notes')}:</span>{' '}
                    {detail.guestNotes}
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wider">
                  {t('items')} ({detail.items.length})
                </div>
                <div className="divide-y">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.productImage ? (
                           
                          <img
                            src={item.productImage}
                            alt={item.productNameEn}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-brand-charcoal truncate">
                          {locale === 'ar' ? item.productNameAr : item.productNameEn}
                        </div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {item.productSku}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-xs text-muted-foreground">×{item.quantity}</div>
                        <div className="font-medium text-brand-charcoal">
                          {formatPrice(item.productPrice * item.quantity, locale)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="p-4 bg-muted/40 rounded-lg space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-medium">{formatPrice(detail.subtotal, locale)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('discount')}</span>
                    <span className="font-medium text-red-600">-{formatPrice(detail.discount, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('shippingCost')}</span>
                  <span className="font-medium">
                    {detail.shippingCost != null ? formatPrice(detail.shippingCost, locale) : '—'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-brand-charcoal">{t('total')}</span>
                  <span className="font-bold text-brand-charcoal text-base">
                    {formatPrice(detail.total, locale)}
                  </span>
                </div>
              </div>

              {/* Status + shipping update */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('updateStatus')}</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(statusLabelKey(s))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('shippingCost')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailId(null)} disabled={saving}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
                  {t('updateStatus')}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
