"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Registration failed');
        return;
      }
      setOk(true);
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-6">
      <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">We’ll send a verification email.</p>
        {ok ? (
          <div className="mt-4 text-sm text-green-600 dark:text-green-400">Check your email to verify your account.</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Already have an account?{' '}
          <button className="underline" onClick={() => router.push('/login')}>
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}
