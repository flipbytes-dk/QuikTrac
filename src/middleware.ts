import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/security/rate-limit'

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

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]!.trim()
  // NextRequest.ip is available on some platforms
  // @ts-expect-error ip may exist at runtime
  return (req.ip as string) || 'unknown'
}

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers)
  const requestId = headers.get('x-request-id') || crypto.randomUUID()
  headers.set('x-request-id', requestId)

  // build response with forwarded request headers
  const res = NextResponse.next({ request: { headers } })

  // Always apply security headers and request id header on response
  applyHeaders(res, securityHeaders)
  res.headers.set('X-Request-Id', requestId)

  // CORS for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin') ?? '*'

    res.headers.set('Access-Control-Allow-Origin', origin || '*')
    res.headers.set('Vary', 'Origin')
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id')
    res.headers.set('Access-Control-Max-Age', '86400')

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers })
    }

    // Basic rate limit: 60 req/min per IP per path
    const key = `${getClientIp(req)}:${req.nextUrl.pathname}`
    const { allowed, remaining, resetAt } = rateLimit({ key, limit: 60, windowMs: 60_000 })
    res.headers.set('X-RateLimit-Limit', '60')
    res.headers.set('X-RateLimit-Remaining', String(remaining))
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))

    if (!allowed) {
      res.headers.set('Retry-After', String(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))))
      res.headers.set('Content-Type', 'application/json')
      return new NextResponse(
        JSON.stringify({ error: 'rate_limited', code: 429, requestId }),
        { status: 429, headers: res.headers }
      )
    }
  }

  return res
}

export const config = {
  // Run on all paths to attach security headers; CORS only affects /api/*
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
