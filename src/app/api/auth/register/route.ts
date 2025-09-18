import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/hash'
import { verifyAccessToken, type RoleName } from '@/lib/auth/jwt'

function badRequest(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

const ALLOWED_ROLES: RoleName[] = ['admin', 'recruiter', 'client']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const roleName = String(body?.role || 'recruiter').toLowerCase() as RoleName

    if (!isValidEmail(email)) return badRequest('invalid_email')
    if (password.length < 8) return badRequest('weak_password')
    if (!ALLOWED_ROLES.includes(roleName)) return badRequest('invalid_role')

    const userCount = await prisma.user.count()

    // Admin-only: if there are existing users, require an admin access token
    if (userCount > 0) {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
      if (!token) return badRequest('unauthorized', 401)
      let claims
      try {
        claims = await verifyAccessToken(token)
      } catch {
        return badRequest('invalid_token', 401)
      }
      if (claims.role !== 'admin') return badRequest('forbidden', 403)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return badRequest('email_in_use', 409)

    const passwordHash = await hashPassword(password)

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    })

    const created = await prisma.user.create({
      data: { email, passwordHash, roleId: role.id },
      select: { id: true, email: true, role: { select: { name: true } }, createdAt: true },
    })

    return NextResponse.json({ id: created.id, email: created.email, role: created.role?.name })
  } catch (e) {
    return badRequest('bad_request')
  }
}
