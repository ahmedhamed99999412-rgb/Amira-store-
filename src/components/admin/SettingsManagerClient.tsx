'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Loader2, Save, Store, Truck, Bell, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type Settings = {
  whatsappNumber: string;
  storeNameAr: string;
  storeNameEn: string;
  email: string | null;
  addressAr: string | null;
  addressEn: string | null;
  currency: string;
  freeShippingEnabled: boolean;
  freeShippingMinOrder: number | null;
  freeShippingStart: string | null;
  freeShippingEnd: string | null;
  announcementAr: string;
  announcementEn: string;
};

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function SettingsManagerClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const ts = useTranslations('admin.settingsForm');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [form, setForm] = useState<Settings>({
    whatsappNumber: '',
    storeNameAr: '',
    storeNameEn: '',
    email: '',
    addressAr: '',
    addressEn: '',
    currency: 'EGP',
    freeShippingEnabled: false,
    freeShippingMinOrder: null,
    freeShippingStart: '',
    freeShippingEnd: '',
    announcementAr: '',
    announcementEn: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const s = data.settings as Settings;
      setForm({
        ...s,
        email: s.email || '',
        addressAr: s.addressAr || '',
        addressEn: s.addressEn || '',
        freeShippingMinOrder: s.freeShippingMinOrder,
        freeShippingStart: toDateInput(s.freeShippingStart),
        freeShippingEnd: toDateInput(s.freeShippingEnd),
      });
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings');
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

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        whatsappNumber: form.whatsappNumber,
        storeNameAr: form.storeNameAr,
        storeNameEn: form.storeNameEn,
        email: form.email || null,
        addressAr: form.addressAr || null,
        addressEn: form.addressEn || null,
        currency: form.currency,
        freeShippingEnabled: form.freeShippingEnabled,
        freeShippingMinOrder: form.freeShippingMinOrder || null,
        freeShippingStart: form.freeShippingStart || null,
        freeShippingEnd: form.freeShippingEnd || null,
        announcementAr: form.announcementAr,
        announcementEn: form.announcementEn,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(ts('saved'));
      // Refresh server components so the header/footer update with new store name
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(locale === 'ar' ? 'كلمتا السر غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error(locale === 'ar' ? 'كلمة السر قصيرة جداً' : 'Password too short');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(ts('passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
          {t('settings')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'ar' ? 'إدارة بيانات المتجر والإعدادات' : 'Manage store data and settings'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-brand-mauve" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
              {ts('storeInfo')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{ts('whatsappNumber')}</Label>
              <Input
                value={form.whatsappNumber}
                onChange={(e) => set('whatsappNumber', e.target.value)}
                dir="ltr"
                placeholder="01019003677"
              />
            </div>
            <div className="space-y-2">
              <Label>{ts('currency')}</Label>
              <Input
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                dir="ltr"
                placeholder="EGP"
              />
            </div>
            <div className="space-y-2">
              <Label>{ts('storeName')} ({locale === 'ar' ? 'عربي' : 'Arabic'})</Label>
              <Input
                value={form.storeNameAr}
                onChange={(e) => set('storeNameAr', e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{ts('storeName')} ({locale === 'ar' ? 'إنجليزي' : 'English'})</Label>
              <Input
                value={form.storeNameEn}
                onChange={(e) => set('storeNameEn', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{ts('email')}</Label>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                dir="ltr"
                placeholder="info@amira-store.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{ts('address')} ({locale === 'ar' ? 'عربي' : 'Arabic'})</Label>
              <Textarea
                value={form.addressAr ?? ''}
                onChange={(e) => set('addressAr', e.target.value)}
                dir="rtl"
                rows={2}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{ts('address')} ({locale === 'ar' ? 'إنجليزي' : 'English'})</Label>
              <Textarea
                value={form.addressEn ?? ''}
                onChange={(e) => set('addressEn', e.target.value)}
                dir="ltr"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Announcement bar */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-brand-mauve" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
              {ts('announcement')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{ts('announcement')} ({locale === 'ar' ? 'عربي' : 'Arabic'})</Label>
              <Textarea
                value={form.announcementAr}
                onChange={(e) => set('announcementAr', e.target.value)}
                dir="rtl"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{ts('announcement')} ({locale === 'ar' ? 'إنجليزي' : 'English'})</Label>
              <Textarea
                value={form.announcementEn}
                onChange={(e) => set('announcementEn', e.target.value)}
                dir="ltr"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Shipping settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-brand-mauve" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
              {ts('shipping')}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <Switch
                id="free-shipping"
                checked={form.freeShippingEnabled}
                onCheckedChange={(v) => set('freeShippingEnabled', v)}
              />
              <Label htmlFor="free-shipping" className="cursor-pointer">
                {ts('freeShipping')}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{ts('freeShippingMinOrder')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.freeShippingMinOrder ?? ''}
                  onChange={(e) =>
                    set('freeShippingMinOrder', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  dir="ltr"
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('freeShippingStart')}</Label>
                <Input
                  type="date"
                  value={form.freeShippingStart ?? ''}
                  onChange={(e) => set('freeShippingStart', e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('freeShippingEnd')}</Label>
                <Input
                  type="date"
                  value={form.freeShippingEnd ?? ''}
                  onChange={(e) => set('freeShippingEnd', e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white min-w-32"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </form>

      {/* Change password */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-brand-mauve" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
            {ts('changePassword')}
          </h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
          <div className="space-y-2">
            <Label>{ts('currentPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{ts('newPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={6}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{ts('confirmPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
              minLength={6}
              dir="ltr"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button
              type="submit"
              disabled={savingPassword}
              variant="outline"
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Lock className="h-4 w-4 me-1" />}
              {ts('changePassword')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
