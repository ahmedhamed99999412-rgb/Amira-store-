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

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('errors.invalidCredentials'));
        return;
      }
      toast.success(t('loginButton'));
      await refresh();
      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/account');
      }
      router.refresh();
    } catch {
      toast.error(t('errors.invalidCredentials'));
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
              {t('loginTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t('loginSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('identifier')}</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                className="h-11"
                placeholder="admin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-brand-mauve"
              />
              <span className="text-muted-foreground">{t('rememberMe')}</span>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('loginButton')}
            </Button>
          </form>

          {/* No "forgot password" link - as requested */}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-brand-mauve hover:underline font-medium">
              {t('createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
