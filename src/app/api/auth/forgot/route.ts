import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signEmailToken } from '@/lib/auth/email-token'
import { sendEmail } from '@/lib/email/resend'

function ok() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email) return ok()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return ok()

    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
    const origin = `${proto}://${host}`

    const token = await signEmailToken({ purpose: 'reset', email: user.email, userId: user.id }, '30m')
    const url = `${origin}/reset/${encodeURIComponent(token)}`

    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
      text: `Reset your password: ${url}`,
    })

    return ok()
  } catch (e) {
    return ok()
  }
}
