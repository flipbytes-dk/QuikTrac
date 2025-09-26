import { NextRequest, NextResponse } from 'next/server'
import { buildQueries, cseSearch } from '@/lib/linkedin/gcse'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const title = String(body?.title || '').trim() || undefined
    const location = String(body?.location || '').trim() || undefined
    const seniority = String(body?.seniority || '').trim() || undefined
    const rawSkills = body?.skills
    const skills: string[] = Array.isArray(rawSkills)
      ? rawSkills.map((s) => String(s).trim()).filter(Boolean)
      : String(rawSkills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

    const limit = Math.min(Math.max(Number(body?.limit || 1000), 1), 2000)
    const perQuery = Math.min(Math.max(Number(body?.perQuery || 100), 10), 100)

    const provided = Array.isArray(body?.queries) ? (body.queries as unknown[]).map(String).map((s) => s.trim()).filter(Boolean) : []
    const queries = provided.length ? provided : buildQueries({ title, location, seniority, skills })
    const seen = new Set<string>()
    const results: { title: string; link: string; snippet?: string }[] = []
    let totalFetched = 0
    const perQueryStats: { q: string; fetched: number }[] = []

    const prefix = 'site:linkedin.com/in -inurl:/jobs/ -inurl:/company/ -inurl:/learning/ -inurl:/salary/ -inurl:/school/'

    function normalize(q: string): string {
      let s = q.trim()
      if (!/site:linkedin\.com\/in/i.test(s)) {
        s = `${prefix} ${s}`.trim()
      }
      for (const ex of ['-inurl:/jobs/', '-inurl:/company/', '-inurl:/learning/', '-inurl:/salary/', '-inurl:/school/']) {
        if (!s.includes(ex)) s = `${ex} ${s}`
      }
      return s.replace(/\s+/g, ' ').trim()
    }

    for (const raw of queries) {
      if (results.length >= limit) break
      const q = normalize(raw)
      let fetchedForQ = 0
      // Google CSE returns up to 10 per page; paginate up to perQuery (start=1,11,21,...)
      for (let start = 1; start <= 91 && fetchedForQ < perQuery && results.length < limit; start += 10) {
        const items = await cseSearch(q, start)
        totalFetched += items.length
        fetchedForQ += items.length
        for (const it of items) {
          if (results.length >= limit) break
          if (!seen.has(it.link)) {
            seen.add(it.link)
            results.push(it)
          }
        }
        if (items.length < 10) break // no more pages
      }
      perQueryStats.push({ q, fetched: fetchedForQ })
    }

    return NextResponse.json({
      results,
      totalFetched,
      uniqueCount: results.length,
      perQuery: perQueryStats,
    })
  } catch (e) {
    return bad('bad_request')
  }
}
