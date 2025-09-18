"use client"

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Login failed')
        return
      }
      // Store access token for API calls (Authorization: Bearer <token>)
      if (data?.accessToken) {
        localStorage.setItem('access_token', data.accessToken)
      }
      router.replace('/dashboard')
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-zinc-950 dark:to-black">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90rem_40rem_at_120%_-10%,hsl(var(--primary)/0.08)_0%,transparent_70%),radial-gradient(40rem_40rem_at_-20%_-10%,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="QuikTrac" width={42} height={42} priority className="drop-shadow-sm" />
          <div className="text-2xl font-semibold tracking-tight">QuikTrac</div>
        </div>

        <div className={cn(
          'mt-8 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 p-6 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/60'
        )}>
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Welcome back. Enter your credentials to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
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
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <input type="checkbox" className="h-3.5 w-3.5" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
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
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
            By signing in you agree to our terms and privacy policy.
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} QuikTrac. All rights reserved.
        </div>
      </div>
    </div>
  )
}
