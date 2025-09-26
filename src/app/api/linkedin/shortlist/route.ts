import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

function bad(msg: string, code = 400) { return NextResponse.json({ error: msg, code }, { status: code }) }

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

    const rows = await (prisma as any).linkedInRanking.findMany({
      where: { jobCode, decision: 'proceed' },
      orderBy: { overallRating: 'desc' },
      skip, take: pageSize,
      include: { profile: true }
    })

    const items = rows.map((r: any) => ({
      id: r.id,
      overallRating: r.overallRating,
      justification: r.result?.justification || '',
      questions: r.result?.questions || [],
      emailBody: r.result?.outreach_email?.body || '',
      whatsappBody: r.result?.whatsapp_message?.body || '',
      firstName: r.profile?.firstName,
      fullName: r.profile?.fullName,
      headline: r.profile?.headline,
      profilePic: r.profile?.profilePic,
      jobTitle: r.profile?.jobTitle,
    }))

    return NextResponse.json({ items })
  } catch {
    return bad('bad_request')
  }
}
