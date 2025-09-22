'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ReactNode, useState } from 'react'

function NavLink({ href, children, onClick }: { href: string; children: ReactNode; onClick?: () => void }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        active ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
      }`}
    >
      {children}
    </Link>
  )
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-zinc-950 dark:to-black">
      {/* Mobile header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-[hsl(var(--card))]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/80 md:hidden">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="QuikTrac" width={32} height={32} />
          <span className="text-lg font-semibold">QuikTrac</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-md p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-[hsl(var(--card))] shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="QuikTrac" width={40} height={40} />
              <span className="text-lg font-semibold">QuikTrac</span>
            </div>
            <button
              onClick={closeMobileMenu}
              className="rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="space-y-2">
            <NavLink href="/dashboard" onClick={closeMobileMenu}>Dashboard</NavLink>
            <NavLink href="/jd-generator" onClick={closeMobileMenu}>JD Generator</NavLink>
            <NavLink href="/linkedin" onClick={closeMobileMenu}>Passive Search (LinkedIn)</NavLink>
            <NavLink href="/ceipal/search" onClick={closeMobileMenu}>Ceipal Search</NavLink>
          </nav>
          <div className="mt-8 border-t border-[hsl(var(--border))] pt-4">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                } finally {
                  window.location.href = '/login'
                }
              }}
              className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-screen-2xl grid-cols-12 gap-8 px-6 py-10">
        {/* Desktop sidebar */}
        <aside className="col-span-3 hidden h-fit self-start rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-5 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70 md:block">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="QuikTrac" width={40} height={40} />
              <span className="text-lg font-semibold">QuikTrac</span>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                } finally {
                  window.location.href = '/login'
                }
              }}
              className="rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
          <nav className="space-y-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/jd-generator">JD Generator</NavLink>
            <NavLink href="/linkedin">Passive Search (LinkedIn)</NavLink>
<NavLink href="/linkedin/shortlist">Shortlist</NavLink>
            <NavLink href="/ceipal/search">Ceipal Search</NavLink>
          </nav>
        </aside>
        <main className="col-span-12 md:col-span-9 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
