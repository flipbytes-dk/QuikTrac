import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken, type RoleName } from '@/lib/auth/jwt'

function unauthorized(msg: string) {
  return NextResponse.json({ error: msg, code: 401 }, { status: 401 })
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
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|; )refresh_token=([^;]*)/)
  if (!match) return unauthorized('no_refresh_cookie')
  const token = decodeURIComponent(match[1])

  let payload
  try {
    payload = await verifyRefreshToken(token)
  } catch {
    return unauthorized('invalid_refresh')
  }
  const userId = String(payload.sub || '')
  if (!userId) return unauthorized('invalid_refresh')

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
  if (!user) return unauthorized('user_not_found')

  const role = (user.role?.name || 'recruiter') as RoleName

  const accessToken = await signAccessToken({ sub: user.id, role })
  const newRefresh = await signRefreshToken({ sub: user.id })

  const refreshTtl = ttlToSeconds(process.env.REFRESH_TOKEN_TTL, 60 * 60 * 24 * 7)
  const prod = process.env.NODE_ENV === 'production'

  const res = NextResponse.json({ accessToken, user: { id: user.id, email: user.email, role } })
  res.headers.append(
    'Set-Cookie',
    `refresh_token=${encodeURIComponent(newRefresh)}; Max-Age=${refreshTtl}; Path=/; HttpOnly; SameSite=Lax; ${
      prod ? 'Secure; ' : ''
    }`
  )
  return res
}
