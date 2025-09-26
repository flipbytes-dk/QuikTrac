'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { storeToken } from '@/lib/auth/token-refresh';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'email_unverified') {
          setError('Please verify your email before signing in.');
        } else {
          setError(data?.error || 'Login failed');
        }
        return;
      }
      // Store access token and initialize automatic refresh
      if (data?.accessToken) {
        storeToken(data.accessToken);
        // Also store with legacy key for backward compatibility
        localStorage.setItem('access_token', data.accessToken);
        // Mark new session and clear any persisted LinkedIn search state
        try {
          const fp = data.accessToken ? String(data.accessToken).slice(0, 12) : 'anon'
          localStorage.setItem('session_login_at', String(Date.now()))
          localStorage.setItem('linkedin_owner_fp', fp)
          ;['linkedin_jd','linkedin_custom','linkedin_queries','linkedin_search_opts','linkedin_job_id','linkedin_saved_at'].forEach(k => localStorage.removeItem(k))
        } catch {}
      }
      router.replace('/dashboard');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-zinc-950 dark:to-black">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90rem_40rem_at_120%_-10%,hsl(var(--primary)/0.08)_0%,transparent_70%),radial-gradient(40rem_40rem_at_-20%_-10%,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      <div className="grid min-h-dvh place-items-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="QuikTrac"
              width={84}
              height={84}
              priority
              className="drop-shadow-sm"
            />
          </div>

          <div
            className={cn(
              'w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70',
            )}
          >
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Sign in</h1>
              <p className="mt-1 text-sm text-[#172233]/85">
                Welcome back. Enter your credentials to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                    />
                    Show
                  </label>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="space-y-1 text-sm text-red-600 dark:text-red-400">
                  <div>{error}</div>
                  {error.includes('verify') ? (
                    <button
                      type="button"
                      className="underline"
                      onClick={async () => {
                        try {
                          await fetch('/api/auth/verify/request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email }),
                          })
                          alert('Verification email sent if the account exists.');
                        } catch {}
                      }}
                    >
                      Resend verification email
                    </button>
                  ) : null}
                </div>
              ) : null}

              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <a href="/forgot" className="text-[#172233]/85 underline hover:text-[#2487FE] transition-colors">Forgot password?</a>
              <a href="/register" className="text-[#172233]/85 underline hover:text-[#2487FE] transition-colors">Create account</a>
            </div>

            <p className="mt-6 text-center text-xs text-[#172233]/85">
              By signing in you agree to our terms and privacy policy.
            </p>
          </div>

          <div className="mt-8 text-center text-xs text-[#172233]/85">
            © {new Date().getFullYear()} QuikTrac. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
