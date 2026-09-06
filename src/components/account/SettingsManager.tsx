'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';

export function SettingsManager({ locale }: { locale: string }) {
  const t = useTranslations('account');
  const { user, refresh } = useAuth();
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      const timeoutId = window.setTimeout(() => {
        setProfileForm({
          fullName: user.fullName || '',
          phone: user.phone,
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.fullName.trim() || !profileForm.phone.trim()) {
      toast.error(locale === 'ar' ? 'يرجى ملء الحقول' : 'Please fill fields');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed');
        return;
      }
      toast.success(t('profileUpdated'));
      refresh();
    } finally {
      setSavingProfile(false);
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
      if (!res.ok) {
        toast.error(data.error || 'Failed');
        return;
      }
      toast.success(t('passwordUpdated'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-medium text-brand-charcoal mb-6">
        {t('settings')}
      </h1>

      {/* Profile */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-4">
          {t('profile')}
        </h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>{locale === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
            <Input value={user?.username || ''} disabled className="h-11 bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>{t('profile')}</Label>
            <Input
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{locale === 'ar' ? 'رقم التليفون' : 'Phone'}</Label>
            <Input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="h-11"
              dir="ltr"
            />
          </div>
          <Button type="submit" disabled={savingProfile} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updateProfile')}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-4">
          {t('changePassword')}
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>{t('currentPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('newPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={6}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('confirmNewPassword')}</Label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
              minLength={6}
              className="h-11"
            />
          </div>
          <Button type="submit" disabled={savingPassword} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updatePassword')}
          </Button>
        </form>
      </div>
    </div>
  );
}
