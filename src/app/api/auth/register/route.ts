import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/hash'
import { type RoleName } from '@/lib/auth/jwt'
import { signEmailToken } from '@/lib/auth/email-token'
import { sendEmail } from '@/lib/email/resend'

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

    // Open signup: no admin gate. First user may become admin manually via DB if needed.

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

    // Send verification email
    // Build origin from request headers
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
    const origin = `${proto}://${host}`

    const token = await signEmailToken({ purpose: 'verify', email: created.email, userId: created.id }, '48h')
    const url = `${origin}/verify/${encodeURIComponent(token)}`

    await sendEmail({
      to: created.email,
      subject: 'Verify your email',
      html: `<p>Welcome to QuikTrac!</p><p>Click to verify your email: <a href="${url}">${url}</a></p>`,
      text: `Welcome to QuikTrac! Verify your email: ${url}`,
    })

    return NextResponse.json({ id: created.id, email: created.email, role: created.role?.name })
  } catch (e) {
    return badRequest('bad_request')
  }
}
