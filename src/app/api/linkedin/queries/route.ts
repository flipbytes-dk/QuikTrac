import { NextRequest, NextResponse } from 'next/server'
import { buildLinkedInMessages } from '@/lib/ai/prompts'
import { chatComplete } from '@/lib/ai/openai'
import { getEnv } from '@/lib/env'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const jd = String(body?.job_description || '').trim()
    const ci = String(body?.custom_instructions || '').trim() || undefined
    if (!jd) return bad('missing_job_description')

    const messages = buildLinkedInMessages(jd, ci)
    // Use LinkedIn-specific model or fall back to environment defaults
    const env = getEnv()
    const models = [
      env.OPENAI_LINKEDIN_MODEL || env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      'gpt-4o-mini' // Fallback for query generation
    ].filter(Boolean)

    const text = await chatComplete(messages, models)

    // Extract strict JSON array
    let arr: string[] | null = null
    try {
      const firstBracket = text.indexOf('[')
      const lastBracket = text.lastIndexOf(']')
      const json = firstBracket !== -1 && lastBracket !== -1 ? text.slice(firstBracket, lastBracket + 1) : text
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) arr = parsed
    } catch {}
    if (!arr) return bad('invalid_ai_output')

    // Dedup and cap 15
    const unique = Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, 15)
    return NextResponse.json({ queries: unique })
  } catch (e) {
    return bad('bad_request')
  }
}
