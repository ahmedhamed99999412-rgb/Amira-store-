'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Loader2,
  Star,
  StarOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type Product = {
  id: string;
  slug: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isDeleted: boolean;
  nameAr: string;
  nameEn: string;
  image: string | null;
  totalStock: number;
  category: { id: string; slug: string; name: string } | null;
};

function formatPrice(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US'
  ).format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

export function ProductsListClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل المنتجات' : 'Failed to load products');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.nameAr, p.nameEn, p.sku, p.slug].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
  }, [products, search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast.success(t('deleted'));
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
            {t('products')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'ar'
              ? `${products.length} منتج في المتجر`
              : `${products.length} products in store`}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
            <Plus className="h-4 w-4 me-1" />
            {t('addProduct')}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchProducts')}
          className="ps-9 h-10"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t('noProducts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1440px] w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[88px]" />
                <col className="w-[280px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[120px]" />
                <col className="w-[180px]" />
                <col className="w-[190px]" />
                <col className="w-[130px]" />
              </colgroup>
              <thead className="bg-muted/50 border-b">
                <tr className="text-start">
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3">{t('image')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3" dir="rtl">{t('name')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3 hidden md:table-cell" dir="ltr">{t('sku')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3">{t('price')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3 hidden sm:table-cell">{t('stock')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3 hidden lg:table-cell">{t('category')}</th>
                  <th className="align-middle whitespace-nowrap text-start font-medium px-4 py-3">{t('status')}</th>
                  <th className="align-middle whitespace-nowrap text-end font-medium px-4 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="align-middle text-start px-4 py-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {p.image ? (
                           
                          <img
                            src={p.image}
                            alt={p.nameEn}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="align-middle text-start px-4 py-3" dir="rtl">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="font-medium text-brand-charcoal hover:text-brand-mauve"
                      >
                        {locale === 'ar' ? p.nameAr : p.nameEn}
                      </Link>
                      <div className="text-xs text-muted-foreground text-start" dir="ltr">
                        {p.slug}
                      </div>
                    </td>
                    <td className="align-middle text-start px-4 py-3 hidden md:table-cell font-mono text-xs" dir="ltr">
                      {p.sku}
                    </td>
                    <td className="align-middle text-start px-4 py-3">
                      <div className="font-medium text-brand-charcoal">
                        {formatPrice(p.price, locale)}
                      </div>
                      {p.comparePrice && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPrice(p.comparePrice, locale)}
                        </div>
                      )}
                    </td>
                    <td className="align-middle text-start px-4 py-3 hidden sm:table-cell">
                      <Badge variant={p.totalStock === 0 ? 'destructive' : p.totalStock < 5 ? 'secondary' : 'outline'}>
                        {formatNumber(p.totalStock, locale)}
                      </Badge>
                    </td>
                    <td className="align-middle text-start px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {p.category?.name || '—'}
                    </td>
                    <td className="align-middle text-start px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.isActive ? (
                          <Badge variant="default">{t('active')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('inactive')}</Badge>
                        )}
                        {p.isFeatured && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3" />
                            {t('featured')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="align-middle text-end px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/products/${p.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(p.id)}
                          aria-label="Delete"
                        >
                          {p.isDeleted ? <StarOff className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('deleteProduct')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
