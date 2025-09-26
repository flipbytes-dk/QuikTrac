export interface LinkedInSearchInput {
title?: string
skills?: string[]
location?: string
seniority?: string
}

export interface CSEItem {
title: string
link: string
snippet?: string
}

export function buildQueries({ title, skills = [], location, seniority }: LinkedInSearchInput): string[] {
const terms: string[] = []
if (title) terms.push(`"${title}"`)
if (seniority) terms.push(seniority)
if (skills.length) terms.push(skills.filter(Boolean).slice(0, 4).join(' '))
if (location) terms.push(location)
// target public profiles only
const base = `site:linkedin.com/in ${terms.join(' ')}`.trim()
// shard queries slightly by appending variations (basic approach to exceed 10 results)
const shards = ['', ' -"open to work"', ' "current"', ' "experience"']
return shards.map((s) => `${base}${s}`)
}

export class CSERateLimitError extends Error {
retryAfterMs: number
status: number
raw?: string
constructor(message: string, retryAfterMs: number, raw?: string) {
  super(message)
  this.name = 'CSERateLimitError'
this.retryAfterMs = retryAfterMs
this.status = 429
  this.raw = raw
}
}

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null
  const s = Number(h)
  if (!Number.isNaN(s) && s > 0) return s * 1000
  // HTTP-date not handled; fallback
  return null
}

export async function cseSearch(query: string, start: number = 1): Promise<CSEItem[]> {
  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!key || !cx) throw new Error('Google CSE not configured')
  const params = new URLSearchParams({ key, cx, q: query, start: String(start) })
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`)
  if (!res.ok) {
    const msg = await res.text()
    if (res.status === 429) {
      const retry = parseRetryAfter(res.headers.get('retry-after')) ?? 60_000
      throw new CSERateLimitError(`CSE rate limit: ${msg}`, retry, msg)
    }
    if (res.status >= 500) {
      // transient; caller may retry
      throw new CSERateLimitError(`CSE transient error ${res.status}: ${msg}`, 5_000, msg)
    }
    throw new Error(`CSE error ${res.status}: ${msg}`)
  }
  const data = await res.json()
  const items = (data.items || []) as any[]
  return items.map((i) => ({ title: i.title, link: i.link, snippet: i.snippet }))
}
