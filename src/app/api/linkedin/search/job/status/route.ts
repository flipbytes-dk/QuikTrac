import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/linkedin/search-jobs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = String(searchParams.get('id') || '')
    if (!id) return bad('missing_id')
    const job = getJob(id)
    if (!job) return bad('not_found', 404)
    return NextResponse.json(job, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return bad('bad_request')
  }
}
