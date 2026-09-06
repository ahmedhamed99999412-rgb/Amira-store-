'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Check, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Address = {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  landmarks: string | null;
  isDefault: boolean;
};

export function AddressesManager({ locale }: { locale: string }) {
  const t = useTranslations('account');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    governorate: '',
    landmarks: '',
    isDefault: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      const res = await fetch('/api/user/addresses', { credentials: 'include' });
      const data = await res.json();
      setAddresses(data.addresses || []);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      governorate: '',
      landmarks: '',
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  }

  function editAddress(addr: Address) {
    setForm({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      governorate: addr.governorate,
      landmarks: addr.landmarks || '',
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.street || !form.city || !form.governorate) {
      toast.error(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save address');
        return;
      }
      toast.success(t('addressAdded'));
      resetForm();
      loadAddresses();
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا العنوان؟' : 'Delete this address?')) return;
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(t('addressDeleted'));
        loadAddresses();
      }
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function setDefault(id: string) {
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
        credentials: 'include',
      });
      if (res.ok) {
        loadAddresses();
      }
    } catch {}
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-medium text-brand-charcoal">
          {t('addresses')}
        </h1>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none"
          >
            <Plus className="h-4 w-4 me-2" />
            {t('addAddress')}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 border border-border rounded-lg mb-6 bg-muted/30">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
            {editingId ? t('editAddress') : t('addAddress')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{t('profile')} *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'ar' ? 'رقم التليفون' : 'Phone'} *</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="h-11"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <Label>{locale === 'ar' ? 'العنوان' : 'Address'} *</Label>
            <Textarea
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              required
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{locale === 'ar' ? 'المحافظة' : 'Governorate'} *</Label>
              <Input
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'ar' ? 'المدينة' : 'City'} *</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <Label>{locale === 'ar' ? 'علامة مميزة' : 'Landmarks'}</Label>
            <Input
              value={form.landmarks}
              onChange={(e) => setForm({ ...form, landmarks: e.target.value })}
              className="h-11"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 accent-brand-mauve"
            />
            <span className="text-sm">{t('setAsDefault')}</span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updateProfile')}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} className="rounded-none">
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-4">
            {locale === 'ar' ? 'لا توجد عناوين محفوظة' : 'No saved addresses'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className={`p-4 border rounded-lg ${addr.isDefault ? 'border-brand-mauve bg-brand-cream/30' : 'border-border'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-brand-charcoal">{addr.fullName}</p>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-brand-mauve text-white px-2 py-0.5 rounded-full">
                        {t('defaultAddress')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{addr.street}</p>
                  <p className="text-sm text-muted-foreground">{addr.city}, {addr.governorate}</p>
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">{addr.phone}</p>
                  {addr.landmarks && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {locale === 'ar' ? 'علامة مميزة:' : 'Landmarks:'} {addr.landmarks}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => editAddress(addr)}
                    className="p-2 text-muted-foreground hover:text-brand-charcoal"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    className="p-2 text-muted-foreground hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefault(addr.id)}
                      className="p-2 text-muted-foreground hover:text-green-600"
                      aria-label="Set default"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
