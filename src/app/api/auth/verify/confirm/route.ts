import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyEmailToken } from '@/lib/auth/email-token'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body?.token || '')
    if (!token) return bad('missing_token')

    let payload
    try {
      payload = await verifyEmailToken(token)
    } catch {
      return bad('invalid_token', 401)
    }
    if (payload.purpose !== 'verify' || !payload.email) return bad('invalid_token', 401)

    await prisma.user.update({ where: { email: payload.email }, data: { emailVerifiedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return bad('bad_request')
  }
}
