import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyEmailToken } from '@/lib/auth/email-token'
import { hashPassword } from '@/lib/auth/hash'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body?.token || '')
    const newPassword = String(body?.newPassword || '')
    if (!token) return bad('missing_token')
    if (newPassword.length < 8) return bad('weak_password')

    let payload
    try {
      payload = await verifyEmailToken(token)
    } catch {
      return bad('invalid_token', 401)
    }
    if (payload.purpose !== 'reset' || !payload.email) return bad('invalid_token', 401)

    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({ where: { email: payload.email }, data: { passwordHash } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return bad('bad_request')
  }
}
