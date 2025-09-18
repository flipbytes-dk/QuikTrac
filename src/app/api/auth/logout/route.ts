import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  const prod = process.env.NODE_ENV === 'production'
  const res = NextResponse.json({ ok: true })
  // Clear cookie by setting Max-Age=0
  res.headers.append(
    'Set-Cookie',
    `refresh_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; ${prod ? 'Secure; ' : ''}`
  )
  return res
}
