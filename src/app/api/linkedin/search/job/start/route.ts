import { NextRequest, NextResponse } from 'next/server'
import { startSearchJob } from '@/lib/linkedin/search-jobs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const provided = Array.isArray(body?.queries) ? (body.queries as unknown[]).map(String).map((s) => s.trim()).filter(Boolean) : []
    if (!provided.length) return bad('missing_queries')
    const limit = Math.min(Math.max(Number(body?.limit || 1000), 1), 2000)
    const perQuery = Math.min(Math.max(Number(body?.perQuery || 100), 10), 100)

    const jobId = startSearchJob({ queries: provided, perQuery, limit })
    return NextResponse.json({ jobId }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return bad('bad_request')
  }
}
