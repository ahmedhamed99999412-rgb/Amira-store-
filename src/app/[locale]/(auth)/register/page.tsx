'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/components/auth/AuthProvider';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    phone: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }
      toast.success(t('registerButton'));
      await refresh();
      router.push('/account');
      router.refresh();
    } catch {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-medium text-brand-charcoal">
              {t('registerTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t('registerSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')} *</Label>
              <Input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')} *</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                required
                placeholder="01012345678"
                className="h-11"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')} *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')} *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('registerButton')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('haveAccount')}{' '}
            <Link href="/login" className="text-brand-mauve hover:underline font-medium">
              {t('loginNow')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
