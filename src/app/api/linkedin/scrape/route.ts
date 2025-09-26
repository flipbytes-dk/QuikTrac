import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getEnv } from '@/lib/env'

function bad(msg: string, code = 400, requestId?: string) {
  return NextResponse.json({ error: msg, code, requestId }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const requestId = req.headers.get('x-request-id') || undefined
    const body = await req.json()
    const urls: string[] = Array.isArray(body?.urls) ? (body.urls as unknown[]).map(String).map((s: string)=>s.trim()).filter(Boolean) : []
    const jobCode: string = String(body?.jobCode || '').trim()
    const digits = (jobCode.match(/\d+/) || [])[0]
    if (!digits) return bad('invalid_job_code', 400, requestId)
    const jobCodeNormalized = `JPC - ${digits}`
    if (!urls.length) return bad('missing_urls', 400, requestId)

    const env = getEnv()
    const endpoint = env.RUN_ACTOR_FETCH_DATA
    if (!endpoint) return bad('scraper_endpoint_not_configured', 500, requestId)

    // Debug
    const userId = req.headers.get('x-user-id') || 'unknown'
    const auth = req.headers.get('authorization')
    console.log('[scrape] start', { requestId, userId, count: urls.length, jobCode, hasAuth: !!auth })

    // Filter out URLs that already exist
    const existing = await prisma.linkedInProfile.findMany({ where: { linkedinUrl: { in: urls } }, select: { linkedinUrl: true } })
    const existingSet = new Set(existing.map(e => e.linkedinUrl))
    const toFetch = urls.filter(u => !existingSet.has(u))

    let saved = 0
    // Batch by 25
    for (let i = 0; i < toFetch.length; i += 25) {
      const batch = toFetch.slice(i, i + 25)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrls: batch }),
      })
      if (!res.ok) {
        const msg = await res.text()
        console.error('[scrape] batch_failed', { requestId, status: res.status, msg: msg.slice(0, 300) })
        return bad(`scraper_failed: ${res.status} ${msg}`, 502, requestId)
      }
      const data = await res.json()
      const items: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
      if (!Array.isArray(items)) continue

      for (const it of items) {
        try {
          const url = String(it?.linkedinUrl || it?.publicIdentifier || '').trim()
          if (!url) continue
          const base = {
            jobCode: jobCodeNormalized,
            // Identity
            firstName: it.firstName ?? undefined,
            lastName: it.lastName ?? undefined,
            fullName: (it.fullName ?? (it.firstName ? `${it.firstName} ${it.lastName ?? ''}`.trim() : undefined)) ?? undefined,
            headline: it.headline ?? undefined,
            publicIdentifier: it.publicIdentifier ?? undefined,
            urn: it.urn ?? undefined,
            openConnection: typeof it.openConnection === 'boolean' ? it.openConnection : undefined,
            // Social
            connections: typeof it.connections === 'number' ? it.connections : undefined,
            followers: typeof it.followers === 'number' ? it.followers : undefined,
            // Contact
            email: it.email ?? undefined,
            mobileNumber: it.mobileNumber ?? undefined,
            // Current role/company
            jobTitle: it.jobTitle ?? undefined,
            companyName: it.companyName ?? undefined,
            companyIndustry: it.companyIndustry ?? undefined,
            companyWebsite: it.companyWebsite ?? undefined,
            companyLinkedin: it.companyLinkedin ?? undefined,
            companyFoundedIn: typeof it.companyFoundedIn === 'number' ? it.companyFoundedIn : undefined,
            companySize: it.companySize ?? undefined,
            currentJobDuration: it.currentJobDuration ?? undefined,
            currentJobDurationInYrs: typeof it.currentJobDurationInYrs === 'number' ? it.currentJobDurationInYrs : undefined,
            // Skills
            topSkillsByEndorsements: it.topSkillsByEndorsements ?? undefined,
            // Location
            addressCountryOnly: it.addressCountryOnly ?? undefined,
            addressWithCountry: it.addressWithCountry ?? undefined,
            addressWithoutCountry: it.addressWithoutCountry ?? undefined,
            location: it.addressWithCountry ?? it.addressCountryOnly ?? undefined,
            // Media
            profilePic: it.profilePic ?? undefined,
            profilePicHighQuality: it.profilePicHighQuality ?? undefined,
            // Bio
            about: it.about ?? undefined,
            // Structured
            experiences: it.experiences ?? undefined,
            updates: it.updates ?? undefined,
            skills: it.skills ?? undefined,
            profilePicAllDimensions: it.profilePicAllDimensions ?? undefined,
            educations: it.educations ?? undefined,
            licenseAndCertificates: it.licenseAndCertificates ?? undefined,
            honorsAndAwards: it.honorsAndAwards ?? undefined,
            languages: it.languages ?? undefined,
            volunteerAndAwards: it.volunteerAndAwards ?? undefined,
            verifications: it.verifications ?? undefined,
            promos: it.promos ?? undefined,
            highlights: it.highlights ?? undefined,
            projects: it.projects ?? undefined,
            publications: it.publications ?? undefined,
            patents: it.patents ?? undefined,
            courses: it.courses ?? undefined,
            testScores: it.testScores ?? undefined,
            organizations: it.organizations ?? undefined,
            volunteerCauses: it.volunteerCauses ?? undefined,
            interests: it.interests ?? undefined,
            recommendations: it.recommendations ?? undefined,
          }

          await prisma.linkedInProfile.upsert({
            where: { linkedinUrl: url },
            update: { json: it, ...base },
            create: { linkedinUrl: url, json: it, ...base },
          })
          saved += 1
        } catch (e) {
          // skip individual errors
        }
      }
    }

    console.log('[scrape] done', { requestId, sent: toFetch.length, skipped: urls.length - toFetch.length, saved })
    return NextResponse.json({ sent: toFetch.length, skipped: urls.length - toFetch.length, saved, requestId })
  } catch (e: any) {
    console.error('[scrape] error', { requestId: req.headers.get('x-request-id') || undefined, message: e?.message })
    return bad('bad_request', 400, req.headers.get('x-request-id') || undefined)
  }
}
