import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

function parseCSV(v?: string | null): string[] | undefined {
  if (!v) return undefined
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const jobCode = searchParams.get('job_code')?.trim() || ''
    const page = Number(searchParams.get('page') || '') || undefined
    const perPage = Number(searchParams.get('perPage') || '') || undefined
    const statuses = parseCSV(searchParams.get('statuses')) || ['Active', 'Open']
    const minStartDate = searchParams.get('min_start_date')?.trim() || ''

    // Read from DB (synced via /api/ceipal/job-postings/sync)
    const statusSet = new Set(statuses.map((s) => s.toLowerCase()))

    const whereConditions: any[] = [
      { OR: Array.from(statusSet).map((s) => ({ status: { equals: s, mode: 'insensitive' } })) },
      // Filter for jobs with non-empty requisition description
      {
        AND: [
          { requisitionDescription: { not: null } },
          { requisitionDescription: { not: '' } }
        ]
      },
      // Filter for jobs with valid jobStartDate
      { jobStartDate: { not: null } }
    ]

    // Add conditional filters only if they have values
    if (jobCode) {
      whereConditions.push({ jobCode: { equals: jobCode } })
    }
    if (q) {
      whereConditions.push({ title: { contains: q, mode: 'insensitive' } })
    }

    // Add date filter if provided (default to 2025-04-01 if minStartDate is not provided)
    const dateFilter = minStartDate || '2025-04-01'
    whereConditions.push({
      jobStartDate: {
        gte: dateFilter
      }
    })

    const items = await prisma.job.findMany({
      where: {
        AND: whereConditions,
      },
      orderBy: { updatedAt: 'desc' },
      take: perPage || undefined,
      skip: page && perPage ? (page - 1) * perPage : undefined,
    })

    const normalized = items.map((it) => ({
      id: it.ceipalId || it.id,
      job_code: it.jobCode || undefined,
      position_title: it.title,
      status_name: it.status || undefined,
      location: it.location || `${it.city || ''}${it.city && it.state ? ', ' : ''}${it.state || ''}${(it.city || it.state) && it.country ? ', ' : ''}${it.country || ''}`.trim() || undefined,
      city: it.city,
      state: it.state,
      country: it.country,
      employment_type: it.employmentType,
      currency: it.currency,
      skills: it.skills,
      requisition_description: it.requisitionDescription,
      job_start_date: it.jobStartDate,
      closing_date: it.closingDate,
      apply_job: it.applyJob,
      pay_rates: it.payRates,
      company: it.company,
      raw: it,
    }))

    // Get job codes that match the same filters as the jobs
    const allCodes = await prisma.job.findMany({
      select: { jobCode: true },
      where: {
        AND: [
          { jobCode: { not: null } },
          // Apply the same filters as the main query
          {
            AND: [
              { requisitionDescription: { not: null } },
              { requisitionDescription: { not: '' } }
            ]
          },
          { jobStartDate: { not: null } },
          {
            jobStartDate: {
              gte: dateFilter
            }
          },
          { OR: Array.from(statusSet).map((s) => ({ status: { equals: s, mode: 'insensitive' } })) },
        ],
      },
      distinct: ['jobCode'],
      orderBy: { jobCode: 'asc' },
    })
    const jobCodes = allCodes.map((r) => r.jobCode!).filter(Boolean)

    return NextResponse.json({ items: normalized, total: normalized.length, jobCodes })
  } catch (e) {
    return bad('failed_to_fetch_job_postings', 500)
  }
}
