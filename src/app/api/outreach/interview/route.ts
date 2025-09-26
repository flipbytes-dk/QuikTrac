import { NextRequest, NextResponse } from 'next/server'
import { buildInterviewMessages } from '@/lib/ai/prompts'
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

    if (!jd) return bad('missing_job_description')
    if (!candidate) return bad('missing_candidate')

    const messages = buildInterviewMessages(jd, instructions, candidate)

    // Use interview-specific model or fall back to environment defaults
    const env = getEnv()
    const models = [
      env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
      'gpt-4o-mini' // Fallback
    ].filter(Boolean)

    const text = await chatComplete(messages, models)

    // Extract JSON from response
    let questions: string[] = []
    try {
      const firstBrace = text.indexOf('{')
      const lastBrace = text.lastIndexOf('}')
      const json = firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text
      const parsed = JSON.parse(json)
      if (parsed?.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions
      }
    } catch {}

    if (questions.length === 0) return bad('invalid_ai_output')

    return NextResponse.json({ questions })
  } catch (e) {
    return bad('bad_request')
  }
}