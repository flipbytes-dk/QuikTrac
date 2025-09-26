import { NextRequest, NextResponse } from 'next/server'
import { buildWhatsAppMessages } from '@/lib/ai/prompts'
import { chatComplete } from '@/lib/ai/openai'
import { getEnv } from '@/lib/env'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const jd = String(body?.job_description || '').trim()
    const instructions = String(body?.instructions || '').trim() || undefined
    const candidate = body?.candidate
    const jobCode = String(body?.job_code || '').trim() || undefined

    if (!jd) return bad('missing_job_description')
    if (!candidate) return bad('missing_candidate')

    const messages = buildWhatsAppMessages(jd, instructions, candidate, jobCode)

    // Use WhatsApp-specific model or fall back to environment defaults
    const env = getEnv()
    const models = [
      env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      'gpt-4o-mini' // WhatsApp messages can use faster model
    ].filter(Boolean)

    const text = await chatComplete(messages, models)

    // Extract JSON from response
    let message = ''
    try {
      const firstBrace = text.indexOf('{')
      const lastBrace = text.lastIndexOf('}')
      const json = firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text
      const parsed = JSON.parse(json)
      if (parsed?.message && typeof parsed.message === 'string') {
        message = parsed.message.trim()
      }
    } catch {}

    if (!message) return bad('invalid_ai_output')

    return NextResponse.json({ message })
  } catch (e) {
    return bad('bad_request')
  }
}