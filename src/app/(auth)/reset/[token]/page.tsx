"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetTokenPage() {
  const { token } = (require('next/navigation').useParams as () => Record<string, string>)();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-6">
      <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        {status === 'ok' ? (
          <div className="mt-4 text-sm text-green-600 dark:text-green-400">Password updated. You can sign in now.</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {status === 'error' ? <div className="text-sm text-red-600 dark:text-red-400">Invalid or expired link.</div> : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
