import { NextRequest, NextResponse } from 'next/server'
import { ceipal } from '@/lib/ceipal/client'
import { prisma } from '@/lib/db/prisma'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    // Authorization already enforced by middleware
    const client = ceipal()
    // Incremental: use fromdate/todate based on latest createdAt in our Job table
    const latest = await prisma.job.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
    const from = latest?.createdAt ? new Date(latest.createdAt) : null
    const formatMDY = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${mm}-${dd}-${yyyy}`
    }
    const fromdate = from ? formatMDY(from) : undefined
    const todate = formatMDY(new Date())
    const items = await client.getActiveOpenJobs({ fromdate, todate })

    let upserts = 0
    for (const it of items as any[]) {
      const ceipalId = String(it.id ?? '')
      if (!ceipalId) continue

      // Basic fields
      const jobCode = String(it.job_code ?? '').trim() || null
      const title = String(it.position_title ?? '').trim() || 'Untitled'
      const status = String(it.job_status ?? '').trim() || null
      const location = String(it.city ?? '').trim() || null
      const description = String(it.public_job_desc ?? '').trim() || null

      // Extended Ceipal fields
      const company = it.company ? Number(it.company) : null
      const remoteOpportunities = String(it.remote_opportunities ?? '').trim() || null
      const city = String(it.city ?? '').trim() || null
      const publicJobDesc = String(it.public_job_desc ?? '').trim() || null
      const modified = String(it.modified ?? '').trim() || null
      const postOnCareerportal = String(it.post_on_careerportal ?? '').trim() || null
      const closingDate = String(it.closing_date ?? '').trim() || null
      const jobStartDate = String(it.job_start_date ?? '').trim() || null
      const jobEndDate = String(it.job_end_date ?? '').trim() || null
      const payRates = it.pay_rates ? JSON.parse(JSON.stringify(it.pay_rates)) : null
      const postedBy = String(it.posted_by ?? '').trim() || null
      const modifiedBy = String(it.modified_by ?? '').trim() || null
      const assignedRecruiter = String(it.assigned_recruiter ?? '').trim() || null
      const salesManager = String(it.sales_manager ?? '').trim() || null
      const primaryRecruiter = String(it.primary_recruiter ?? '').trim() || null
      const businessUnitId = it.business_unit_id ? Number(it.business_unit_id) : null
      const currency = String(it.currency ?? '').trim() || null
      const employmentType = String(it.employment_type ?? '').trim() || null
      const isRecycle = it.is_recycle ? Number(it.is_recycle) : null
      const publicJobTitle = String(it.public_job_title ?? '').trim() || null
      const priority = String(it.priority ?? '').trim() || null
      const requisitionDescription = String(it.requisition_description ?? '').trim() || null
      const skills = String(it.skills ?? '').trim() || null
      const createdBy = String(it.created_by ?? '').trim() || null
      const recruitmentManager = String(it.recruitment_manager ?? '').trim() || null
      const postalCode = String(it.postal_code ?? '').trim() || null
      const state = String(it.state ?? '').trim() || null
      const secondaryCities = String(it.secondary_cities ?? '').trim() || null
      const secondaryPostalCodes = String(it.secondary_postal_codes ?? '').trim() || null
      const secondaryStates = String(it.secondary_states ?? '').trim() || null
      const country = String(it.country ?? '').trim() || null
      const taxTerms = String(it.tax_terms ?? '').trim() || null
      const industry = String(it.industry ?? '').trim() || null
      const updated = String(it.updated ?? '').trim() || null
      const jobType = String(it.job_type ?? '').trim() || null
      const jobCategory = String(it.job_category ?? '').trim() || null
      const applyJob = String(it.apply_job ?? '').trim() || null
      const applyJobWithoutRegistration = String(it.apply_job_without_registration ?? '').trim() || null

      const jobData = {
        ceipalId,
        jobCode,
        title,
        status,
        location,
        description,
        company,
        remoteOpportunities,
        city,
        publicJobDesc,
        modified,
        postOnCareerportal,
        closingDate,
        jobStartDate,
        jobEndDate,
        payRates,
        postedBy,
        modifiedBy,
        assignedRecruiter,
        salesManager,
        primaryRecruiter,
        businessUnitId,
        currency,
        employmentType,
        isRecycle,
        publicJobTitle,
        priority,
        requisitionDescription,
        skills,
        createdBy,
        recruitmentManager,
        postalCode,
        state,
        secondaryCities,
        secondaryPostalCodes,
        secondaryStates,
        country,
        taxTerms,
        industry,
        updated,
        jobType,
        jobCategory,
        applyJob,
        applyJobWithoutRegistration,
      }

      await prisma.job.upsert({
        where: { ceipalId },
        update: jobData,
        create: jobData,
      })
      upserts++
    }

    return NextResponse.json({ ok: true, count: (items as any[]).length, upserts })
  } catch (e: any) {
    console.error('[sync][job-postings] failed', { error: e?.message })
    return bad('sync_failed', 500)
  }
}
