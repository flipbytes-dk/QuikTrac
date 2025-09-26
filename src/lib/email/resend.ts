import { getEnv } from '@/lib/env'

export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ id: string | null }> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = getEnv()
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    throw new Error('Resend not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html, text }),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Resend error: ${res.status} ${msg}`)
  }
  const data = (await res.json()) as { id?: string }
  return { id: data.id || null }
}
