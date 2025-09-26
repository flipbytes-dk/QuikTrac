import { NextRequest, NextResponse } from 'next/server'
import { generateJD } from '@/lib/ai/openai'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const title = String(body?.title || '').trim()
    if (!title) return bad('missing_title')

    const seniority = String(body?.seniority || '').trim() || undefined
    const location = String(body?.location || '').trim() || undefined
    const comp = String(body?.comp || '').trim() || undefined
    const domain = String(body?.domain || '').trim() || undefined
    const tone = (String(body?.tone || '').trim().toLowerCase() || 'neutral') as 'neutral' | 'friendly' | 'formal'
    const additionalInstructions = String(body?.additionalInstructions || '').trim() || undefined

    const rawSkills = body?.skills
    const skills: string[] = Array.isArray(rawSkills)
      ? rawSkills.map((s) => String(s).trim()).filter(Boolean)
      : String(rawSkills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

    const markdown = await generateJD({ title, seniority, skills, location, comp, domain, tone, additionalInstructions })
    return NextResponse.json({ markdown })
  } catch (e) {
    return bad('bad_request')
  }
}
