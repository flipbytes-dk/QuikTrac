import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rankManyLinkedInConcurrent, type CandidateInput } from '@/lib/ai/ranking'

function bad(msg: string, code = 400, requestId?: string) {
  return NextResponse.json({ error: msg, code, requestId }, { status: code })
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || undefined
  try {
    const body = await req.json()
    const jobCodeRaw: string = String(body?.jobCode || '').trim()
    const digits = (jobCodeRaw.match(/\d+/) || [])[0]
    if (!digits) return bad('invalid_job_code', 400, requestId)
    const jobCode = `JPC - ${digits}`
    const urls: string[] = Array.isArray(body?.urls) ? (body.urls as unknown[]).map(String).map((s: string)=>s.trim()).filter(Boolean) : []
    const jd: string | undefined = body?.jd ? String(body.jd) : undefined
    const instructions: string | undefined = body?.instructions ? String(body.instructions) : undefined
    const concurrency = Math.max(1, Math.min(Number(body?.concurrency || 5), 10))

    // Upsert Job by jobCode if provided
    // Use any-cast until migration adds jobCode
    let job = await (prisma as any).job.findFirst({ where: { jobCode } })
    if (!job) {
      job = await (prisma as any).job.create({ data: { jobCode, title: body?.title || 'LinkedIn Passive', description: jd, customInstructions: instructions } })
    } else {
      await (prisma as any).job.update({ where: { id: job.id }, data: { description: jd ?? job.description, customInstructions: instructions ?? job.customInstructions } })
    }

    const profiles = await prisma.linkedInProfile.findMany({ where: { linkedinUrl: { in: urls } } })
    if (!profiles.length) return bad('no_profiles_found', 404, requestId)

    const items = profiles.map((p) => ({
      jd: job!.description || '',
      instructions: job!.customInstructions || undefined,
      candidate: mapProfileToCandidate(p),
    }))

    console.log('[linkedin-rank] start', { requestId, jobCode, count: items.length, concurrency })
    const { results, diag } = await rankManyLinkedInConcurrent(items, concurrency)

    let saved = 0
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i]
      const r = results[i]
      if (!r) continue
      const json = r.json ?? safeParse(r.raw)
      await (prisma as any).linkedInRanking.upsert({
        where: { composite: { profileId: p.id, jobCode } },
        update: { result: json ?? r.raw, overallRating: json?.overall_rating ?? null, decision: json?.decision ?? null, email: json?.outreach_email ?? null, scoreBreakdown: json?.score_breakdown ?? null, questions: json?.questions ?? null },
        create: { profileId: p.id, jobCode, result: json ?? r.raw, overallRating: json?.overall_rating ?? null, decision: json?.decision ?? null, email: json?.outreach_email ?? null, scoreBreakdown: json?.score_breakdown ?? null, questions: json?.questions ?? null },
      })
      saved++
    }

    return NextResponse.json({ ranked: results.length, saved, diag, requestId })
  } catch (e: any) {
    console.error('[rank] error', { requestId, message: e?.message })
    return bad('bad_request', 400, requestId)
  }
}

function safeParse(s: string) { try { return JSON.parse(s) } catch { return null } }

function mapProfileToCandidate(p: any): CandidateInput {
  return {
    id: p.id,
    linkedin_url: p.linkedinUrl,
    full_name: p.fullName,
    first_name: p.firstName,
    last_name: p.lastName,
    headline: p.headline,
    about: p.about,
    email: p.email,
    phone: p.mobileNumber,
    current_title: p.jobTitle,
    current_company: p.companyName,
    current_duration_years: p.currentJobDurationInYrs,
    location: p.addressWithCountry || p.location,
    country: p.addressCountryOnly,
    connections: p.connections,
    followers: p.followers,
    skills_top: p.topSkillsByEndorsements ? String(p.topSkillsByEndorsements).split(',').map((s: string)=>s.trim()).filter(Boolean) : [],
    skills_all: [],
    companies_worked: [],
    roles_timeline: p.experiences || [],
    educations: p.educations || [],
    certificates: p.licenseAndCertificates || [],
    projects: p.projects || [],
    recommendations_received: null,
    recommendations_received_text: [],
  }
}
