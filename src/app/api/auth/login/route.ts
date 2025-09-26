import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/hash'
import { signAccessToken, signRefreshToken, type RoleName } from '@/lib/auth/jwt'

function badRequest(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

function ttlToSeconds(ttl: string | undefined, fallback: number): number {
  const s = (ttl || '').trim()
  if (!s) return fallback
  const m = s.match(/^(\d+)([smhd])$/i)
  if (!m) return fallback
  const val = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400
  return val * mult
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!isValidEmail(email)) return badRequest('invalid_email')
    if (!password) return badRequest('missing_password')

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })
    if (!user) return badRequest('invalid_credentials', 401)

    if (!user.emailVerifiedAt) {
      return badRequest('email_unverified', 403)
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return badRequest('invalid_credentials', 401)

    const role = (user.role?.name || 'recruiter') as RoleName

    const accessToken = await signAccessToken({ sub: user.id, role })
    const refreshToken = await signRefreshToken({ sub: user.id })

    const refreshTtl = ttlToSeconds(process.env.REFRESH_TOKEN_TTL, 60 * 60 * 24 * 7) // default 7d
    const prod = process.env.NODE_ENV === 'production'

    const res = NextResponse.json({
      accessToken,
      user: { id: user.id, email: user.email, role },
    })

    res.headers.append(
      'Set-Cookie',
      `refresh_token=${encodeURIComponent(refreshToken)}; Max-Age=${refreshTtl}; Path=/; HttpOnly; SameSite=Lax; ${
        prod ? 'Secure; ' : ''
      }`
    )

    return res
  } catch (e) {
    return badRequest('bad_request')
  }
}
