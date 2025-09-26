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
    if (user.emailVerifiedAt) return ok()

    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
    const origin = `${proto}://${host}`

    const token = await signEmailToken({ purpose: 'verify', email: user.email, userId: user.id }, '48h')
    const url = `${origin}/verify/${encodeURIComponent(token)}`

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
      text: `Verify your email: ${url}`,
    })

    return ok()
  } catch (e) {
    return ok()
  }
}
