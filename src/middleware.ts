import { NextResponse, type NextRequest } from 'next/server'

// Basic security headers + permissive CORS for API routes
// Tune CORS origins in production.

const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  // Avoid legacy headers like X-XSS-Protection (deprecated)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

function applyHeaders(resp: NextResponse, headers: Record<string, string>) {
  for (const [k, v] of Object.entries(headers)) {
    resp.headers.set(k, v)
  }
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Always apply security headers
  applyHeaders(res, securityHeaders)

  // CORS for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin') ?? '*'

    res.headers.set('Access-Control-Allow-Origin', origin || '*')
    res.headers.set('Vary', 'Origin')
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.headers.set('Access-Control-Max-Age', '86400')

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers })
    }
  }

  return res
}

export const config = {
  // Run on all paths to attach security headers; CORS only affects /api/*
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
