"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyTokenPage() {
  const router = useRouter();
  const { token } = (require('next/navigation').useParams as () => Record<string, string>)();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) setStatus('ok');
        else setStatus('error');
      } catch {
        setStatus('error');
      }
    };
    run();
  }, [token]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-6">
      <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 text-center shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70">
        {status === 'pending' && <p>Verifying…</p>}
        {status === 'ok' && (
          <div>
            <p className="text-green-600 dark:text-green-400">Email verified. You can now sign in.</p>
            <button className="mt-4 underline" onClick={() => router.push('/login')}>Go to login</button>
          </div>
        )}
        {status === 'error' && <p className="text-red-600 dark:text-red-400">Invalid or expired link.</p>}
      </div>
    </main>
  );
}
