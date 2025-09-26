import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const to = String(body?.to || '').trim().toLowerCase()
    const subject = String(body?.subject || '').trim()
    const html = typeof body?.html === 'string' ? body.html : undefined
    const text = typeof body?.text === 'string' ? body.text : undefined

    if (!to || !subject || (!html && !text)) return bad('invalid_payload')

    const { id } = await sendEmail({ to, subject, html, text })
    return NextResponse.json({ id })
  } catch (e) {
    return bad('bad_request')
  }
}
