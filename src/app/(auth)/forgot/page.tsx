"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-6">
      <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">We’ll email you a reset link.</p>
        {sent ? (
          <div className="mt-4 text-sm text-green-600 dark:text-green-400">If that email exists, a reset link has been sent.</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
