'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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

type Banner = {
  id: string;
  type: string;
  base64Data: string;
  mimeType: string;
  fileSize: number;
  titleAr: string | null;
  titleEn: string | null;
  subtitleAr: string | null;
  subtitleEn: string | null;
  ctaTextAr: string | null;
  ctaTextEn: string | null;
  ctaLink: string | null;
  ctaLinkAr: string;
  ctaLinkEn: string;
  order: number;
  isActive: boolean;
};

function readFileAsBase64(file: File): Promise<{ base64Data: string; mimeType: string; fileSize: number; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64Data: result.split(',')[1],
        mimeType: file.type,
        fileSize: file.size,
        preview: result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BannersManagerClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    type: 'HERO',
    titleAr: '',
    titleEn: '',
    subtitleAr: '',
    subtitleEn: '',
    ctaTextAr: '',
    ctaTextEn: '',
    ctaLink: '',
    ctaLinkAr: '',
    ctaLinkEn: '',
    order: '1',
    isActive: true,
  });
  const [imageData, setImageData] = useState<{ base64Data: string; mimeType: string; fileSize: number; preview: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل البانرات' : 'Failed to load banners');
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

  const heroBanners = banners.filter((b) => b.type === 'HERO');
  const promoBanners = banners.filter((b) => b.type === 'PROMO');
  const otherBanners = banners.filter((b) => b.type !== 'HERO' && b.type !== 'PROMO');

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'HERO',
      titleAr: '',
      titleEn: '',
      subtitleAr: '',
      subtitleEn: '',
      ctaTextAr: '',
      ctaTextEn: '',
      ctaLink: '',
      ctaLinkAr: '',
      ctaLinkEn: '',
      order: '1',
      isActive: true,
    });
    setImageData(null);
    setDialogOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm({
      type: banner.type,
      titleAr: banner.titleAr || '',
      titleEn: banner.titleEn || '',
      subtitleAr: banner.subtitleAr || '',
      subtitleEn: banner.subtitleEn || '',
      ctaTextAr: banner.ctaTextAr || '',
      ctaTextEn: banner.ctaTextEn || '',
      ctaLink: banner.ctaLink || '',
      ctaLinkAr: banner.ctaLinkAr || banner.ctaLink || '',
      ctaLinkEn: banner.ctaLinkEn || banner.ctaLink || '',
      order: String(banner.order + 1),
      isActive: banner.isActive,
    });
    setImageData(null);
    setDialogOpen(true);
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    try {
      const data = await readFileAsBase64(file);
      setImageData(data);
    } catch {
      toast.error(locale === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && !imageData) {
      toast.error(locale === 'ar' ? 'يرجى رفع صورة' : 'Please upload an image');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        titleAr: form.titleAr || null,
        titleEn: form.titleEn || null,
        subtitleAr: form.subtitleAr || null,
        subtitleEn: form.subtitleEn || null,
        ctaTextAr: form.ctaTextAr || null,
        ctaTextEn: form.ctaTextEn || null,
        ctaLink: form.ctaLink || null,
        ctaLinkAr: form.ctaLinkAr || null,
        ctaLinkEn: form.ctaLinkEn || null,
        order: Math.max(0, (parseInt(form.order, 10) || 1) - 1),
        isActive: form.isActive,
      };

      if (imageData) {
        payload.base64Data = imageData.base64Data;
        payload.mimeType = imageData.mimeType;
        payload.fileSize = imageData.fileSize;
      }

      const url = editing ? `/api/admin/banners/${editing.id}` : '/api/admin/banners';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      toast.success(t('saved'));
      setDialogOpen(false);
      load();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(t('deleted'));
      setDeleteId(null);
      load();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setDeleting(false);
    }
  }

  async function moveBanner(banner: Banner, direction: -1 | 1) {
    const siblings = banners
      .filter((item) => item.type === banner.type)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((item) => item.id === banner.id);
    const target = siblings[index + direction];
    if (!target) return;
    try {
      const reordered = [...siblings];
      [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
      const responses = await Promise.all(reordered.map((item, itemIndex) => fetch(`/api/admin/banners/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order: itemIndex }),
      })));
      if (responses.some((response) => !response.ok)) throw new Error('Failed to update banner order');
      await load();
      toast.success(locale === 'ar' ? 'تم تحديث ترتيب البانرات' : 'Banner order updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('saveFailed'));
    }
  }

  function renderBannerCard(b: Banner) {
    const src = `data:${b.mimeType};base64,${b.base64Data}`;
    return (
      <Card key={b.id} className="overflow-hidden p-0 group">
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          { }
          <img src={src} alt={b.titleEn || ''} className="w-full h-full object-cover" />
          <div className="absolute top-2 start-2 flex gap-1">
            <Badge variant={b.type === 'HERO' ? 'default' : 'secondary'}>
              {t(b.type.toLowerCase())}
            </Badge>
            {!b.isActive && (
              <Badge variant="destructive" className="gap-1">
                <EyeOff className="h-3 w-3" />
                {t('inactive')}
              </Badge>
            )}
          </div>
          <div className="absolute top-2 end-2 z-30 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs gap-1"
              onClick={() => openEdit(b)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {locale === 'ar' ? 'تعديل' : 'Edit'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs gap-1 text-red-600"
              onClick={() => setDeleteId(b.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {locale === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </div>
          {(b.titleAr || b.titleEn || b.subtitleAr || b.subtitleEn) && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white">
              {b.titleAr && locale === 'ar' && (
                <div className="font-serif text-lg font-bold">{b.titleAr}</div>
              )}
              {b.titleEn && locale === 'en' && (
                <div className="font-serif text-lg font-bold">{b.titleEn}</div>
              )}
              {b.subtitleAr && locale === 'ar' && (
                <div className="text-xs opacity-90">{b.subtitleAr}</div>
              )}
              {b.subtitleEn && locale === 'en' && (
                <div className="text-xs opacity-90">{b.subtitleEn}</div>
              )}
            </div>
          )}
        </div>
        <div className="p-3 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>{t('order')}: {b.order + 1}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBanner(b, -1)} aria-label={locale === 'ar' ? 'تحريك لأعلى' : 'Move up'}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBanner(b, 1)} aria-label={locale === 'ar' ? 'تحريك لأسفل' : 'Move down'}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          {(b.ctaLinkAr || b.ctaLinkEn || b.ctaLink) && <span className="truncate max-w-32" dir="ltr">{b.ctaLinkEn || b.ctaLinkAr || b.ctaLink}</span>}
        </div>
      </Card>
    );
  }

  function renderBannerSection(title: string, list: Banner[]) {
    if (list.length === 0) return null;
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal mb-3">
          {title} ({list.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(renderBannerCard)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
            {t('banners')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'ar'
              ? `${banners.length} بانر`
              : `${banners.length} banners`}
          </p>
        </div>
        <Button onClick={openAdd} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
          <Plus className="h-4 w-4 me-1" />
          {t('addBanner')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">{t('noBanners')}</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {renderBannerSection(t('hero'), heroBanners)}
          {renderBannerSection(t('promo'), promoBanners)}
          {otherBanners.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal mb-3">
                {locale === 'ar' ? 'أخرى' : 'Other'} ({otherBanners.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherBanners.map(renderBannerCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('editBanner') : t('addBanner')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image preview / upload */}
            <div className="space-y-2">
              <Label>{t('imageUpload')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
              {imageData ? (
                <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-muted">
                  { }
                  <img src={imageData.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageData(null)}
                    className="absolute top-2 end-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    aria-label="remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : editing ? (
                <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-muted">
                  { }
                  <img
                    src={`data:${editing.mimeType};base64,${editing.base64Data}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 end-2 bg-black/60 text-white rounded-md px-2 py-1 text-xs hover:bg-black/80 flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {t('selectImage')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg hover:border-brand-mauve hover:bg-brand-cream transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">{t('selectImage')}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('bannerType')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HERO">{t('hero')}</SelectItem>
                    <SelectItem value="PROMO">{t('promo')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('order')}</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('titleAr')}</Label>
                <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t('titleEn')}</Label>
                <Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t('subtitleAr')}</Label>
                <Input value={form.subtitleAr} onChange={(e) => setForm({ ...form, subtitleAr: e.target.value })} dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t('subtitleEn')}</Label>
                <Input value={form.subtitleEn} onChange={(e) => setForm({ ...form, subtitleEn: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t('ctaTextAr')}</Label>
                <Input value={form.ctaTextAr} onChange={(e) => setForm({ ...form, ctaTextAr: e.target.value })} dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t('ctaTextEn')}</Label>
                <Input value={form.ctaTextEn} onChange={(e) => setForm({ ...form, ctaTextEn: e.target.value })} dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{locale === 'ar' ? 'رابط الزر بالعربية' : 'Arabic button link'}</Label>
                <Input value={form.ctaLinkAr} onChange={(e) => setForm({ ...form, ctaLinkAr: e.target.value })} placeholder="/ar/shop" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{locale === 'ar' ? 'رابط الزر بالإنجليزية' : 'English button link'}</Label>
                <Input value={form.ctaLinkEn} onChange={(e) => setForm({ ...form, ctaLinkEn: e.target.value })} placeholder="/en/shop" dir="ltr" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {locale === 'ar' ? 'سيستخدم المتجر رابط اللغة الحالية تلقائيًا.' : 'The storefront automatically uses the link for the active language.'}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="banner-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="banner-active" className="cursor-pointer flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {form.isActive ? t('active') : t('inactive')}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={saving} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
                {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                {editing ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteBanner')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t('deleteBanner')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
