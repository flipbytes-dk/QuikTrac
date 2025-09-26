import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rankManyResumeConcurrent, type CandidateInput } from '@/lib/ai/ranking'

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
    const applicantIds: string[] = Array.isArray(body?.applicantIds) ? body.applicantIds.map(String).filter(Boolean) : []
    const jd: string | undefined = body?.jd ? String(body.jd) : undefined
    const instructions: string | undefined = body?.instructions ? String(body.instructions) : undefined
    const concurrency = Math.max(1, Math.min(Number(body?.concurrency || 5), 10))

    // Find job by jobCode
    const job = await prisma.job.findFirst({ where: { jobCode } })
    if (!job) return bad('job_not_found', 404, requestId)

    // Update job description and instructions if provided
    if (jd || instructions) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          description: jd ?? job.description,
          customInstructions: instructions ?? job.customInstructions
        }
      })
    }

    // Get applicants with their parsed profiles
    const applicants = applicantIds.length > 0
      ? await prisma.applicant.findMany({
          where: { id: { in: applicantIds }, jobId: job.id },
          include: { parsedProfile: true }
        })
      : await prisma.applicant.findMany({
          where: { jobId: job.id, status: { in: ['parsed'] } },
          include: { parsedProfile: true }
        })

    if (!applicants.length) return bad('no_applicants_found', 404, requestId)

    // Filter applicants that have parsed profiles
    const applicantsWithProfiles = applicants.filter(a => a.parsedProfile)
    if (!applicantsWithProfiles.length) return bad('no_parsed_profiles_found', 404, requestId)

    const items = applicantsWithProfiles.map((a) => ({
      jd: job.description || jd || '',
      instructions: job.customInstructions || instructions || undefined,
      candidate: mapApplicantToCandidate(a),
    }))

    console.log('[ceipal-rank] start', { requestId, jobCode, count: items.length, concurrency })
    const { results, diag } = await rankManyResumeConcurrent(items, concurrency)

    let saved = 0
    for (let i = 0; i < applicantsWithProfiles.length; i++) {
      const applicant = applicantsWithProfiles[i]
      const result = results[i]
      if (!result) continue

      const json = result.json ?? safeParse(result.raw)
      const score = json?.overall_rating ? Math.round(json.overall_rating * 10) : 50 // Scale 0-1 to 0-100

      await prisma.ranking.upsert({
        where: {
          jobId_applicantId: { jobId: job.id, applicantId: applicant.id }
        },
        update: {
          score,
          explanation: json?.justification || result.raw,
          rubric: json || null
        },
        create: {
          jobId: job.id,
          applicantId: applicant.id,
          score,
          explanation: json?.justification || result.raw,
          rubric: json || null
        },
      })

      // Update applicant status to ranked
      await prisma.applicant.update({
        where: { id: applicant.id },
        data: { status: 'ranked' }
      })

      saved++
    }

    return NextResponse.json({ ranked: results.length, saved, diag, requestId })
  } catch (e: any) {
    console.error('[ceipal-rank] error', { requestId, message: e?.message })
    return bad('bad_request', 400, requestId)
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s) } catch { return null }
}

function mapApplicantToCandidate(applicant: any): CandidateInput {
  const profile = applicant.parsedProfile?.json || {}
  const parsedProfile = applicant.parsedProfile || {}

  return {
    id: applicant.id,
    linkedin_url: undefined,
    full_name: applicant.name || profile.name || profile.fullName || 'Unknown',
    first_name: profile.firstName || applicant.name?.split(' ')[0] || 'Unknown',
    last_name: profile.lastName || applicant.name?.split(' ').slice(1).join(' ') || '',
    headline: profile.headline || profile.currentTitle || profile.jobTitle || '',
    about: profile.summary || profile.about || profile.objective || '',
    email: applicant.email || profile.email,
    phone: applicant.phone || profile.phone || profile.phoneNumber,
    current_title: profile.currentTitle || profile.jobTitle || profile.title || '',
    current_company: profile.currentCompany || profile.company || profile.employer || '',
    current_duration_years: profile.currentJobDurationInYrs || parsedProfile.totalExpMonths ? Math.round(parsedProfile.totalExpMonths / 12) : 0,
    location: applicant.location || profile.location || parsedProfile.location || profile.address,
    country: profile.country || '',
    connections: null,
    followers: null,
    // Leverage the structured fields from ParsedProfile table
    skills_top: parsedProfile.skills || applicant.skills || profile.skills || profile.technicalSkills || [],
    skills_all: profile.allSkills || profile.skills || [],
    companies_worked: profile.workExperience?.map((exp: any) => ({
      company: exp.company || exp.employer,
      title: exp.title || exp.position || exp.jobTitle,
      start: exp.startDate || exp.from,
      end: exp.endDate || exp.to
    })).filter(Boolean) || [],
    roles_timeline: profile.workExperience || profile.experience || [],
    educations: profile.education || profile.educations || profile.qualifications || [],
    certificates: profile.certifications || profile.certificates || profile.licenses || [],
    projects: profile.projects || profile.notableProjects || [],
    recommendations_received: null,
    recommendations_received_text: [],
    // Additional fields specific to resume parsing
    titles: parsedProfile.titles || profile.jobTitles || [],
    totalExpMonths: parsedProfile.totalExpMonths || 0,
  }
}