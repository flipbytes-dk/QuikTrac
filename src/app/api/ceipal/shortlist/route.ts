import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobCodeRaw = String(searchParams.get('jobCode') || '')
    const digits = (jobCodeRaw.match(/\d+/) || [])[0]
    if (!digits) return bad('invalid_job_code')
    const jobCode = `JPC - ${digits}`
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 10)))
    const skip = (page - 1) * pageSize
    const minScore = Number(searchParams.get('minScore') || 70) // Only show candidates with score >= 70

    // Find job by jobCode
    const job = await prisma.job.findFirst({ where: { jobCode } })
    if (!job) return bad('job_not_found', 404)

    const rankings = await prisma.ranking.findMany({
      where: {
        jobId: job.id,
        score: { gte: minScore }
      },
      orderBy: { score: 'desc' },
      skip,
      take: pageSize,
      include: {
        applicant: {
          include: {
            parsedProfile: true
          }
        }
      }
    })

    const items = rankings.map((ranking) => {
      const applicant = ranking.applicant
      const profile = (applicant.parsedProfile?.json as any) || {}
      const rubric = (ranking.rubric as any) || {}

      return {
        id: ranking.id,
        applicantId: applicant.id,
        score: ranking.score,
        explanation: ranking.explanation || '',
        rubric: ranking.rubric || {},
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        location: applicant.location,
        yearsExperience: applicant.yearsExperience,
        skills: applicant.skills,
        currentTitle: profile.currentTitle || profile.jobTitle || '',
        currentCompany: profile.currentCompany || profile.company || '',
        summary: profile.summary || profile.about || '',
        // Questions and outreach from rubric if available
        questions: rubric.questions || [],
        emailBody: rubric.outreach_email?.body || '',
        whatsappBody: rubric.whatsapp_message?.body || '',
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.ranking.count({
      where: {
        jobId: job.id,
        score: { gte: minScore }
      }
    })

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        pages: Math.ceil(totalCount / pageSize)
      }
    })
  } catch (e: any) {
    console.error('[ceipal-shortlist] error', e)
    return bad('bad_request')
  }
}