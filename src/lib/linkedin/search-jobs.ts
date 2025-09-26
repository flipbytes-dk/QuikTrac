import { cseSearch, CSERateLimitError } from './gcse'

export interface Result { title: string; link: string; snippet?: string }
export interface PerQueryStat { q: string; fetched: number }

export type JobStatus = 'pending' | 'running' | 'complete' | 'error' | 'canceled'

export interface SearchJob {
  id: string
  status: JobStatus
  createdAt: number
  updatedAt: number
  input: { queries: string[]; perQuery: number; limit: number }
  totalFetched: number
  perQuery: PerQueryStat[]
  results: Result[]
  error?: string
  pausedUntil?: number
  note?: string
  // internal
  _seen: Set<string>
  _cancel?: boolean
}

import { getJobStore } from './job-store'
const JOBS = getJobStore<SearchJob>()

function makeId() {
  // Simple unique ID
  return 'job_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getJob(id: string): Omit<SearchJob, '_seen' | '_cancel'> | undefined {
  const j = JOBS.get(id)
  if (!j) return undefined
  const { _seen, _cancel, ...pub } = j
  return pub
}

export function cancelJob(id: string) {
  const j = JOBS.get(id)
  if (j) j._cancel = true
}

export function startSearchJob(input: { queries: string[]; perQuery: number; limit: number }) {
  const id = makeId()
  const job: SearchJob = {
    id,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    input,
    totalFetched: 0,
    perQuery: [],
    results: [],
    _seen: new Set<string>(),
  }
  JOBS.set(id, job)
  // Run shortly after returning to avoid tying to request lifecycle
  setTimeout(() => runJob(id).catch(() => {/* errors captured in job */}), 0)
  return id
}

async function runJob(id: string) {
  const job = JOBS.get(id)
  if (!job) return
  job.status = 'running'
  job.updatedAt = Date.now()

  try {
    const { queries, perQuery, limit } = job.input
    const prefix = 'site:linkedin.com/in -inurl:/jobs/ -inurl:/company/ -inurl:/learning/ -inurl:/salary/ -inurl:/school/'

    function normalize(q: string): string {
      let s = q.trim()
      if (!/site:linkedin\.com\/in/i.test(s)) s = `${prefix} ${s}`.trim()
      for (const ex of ['-inurl:/jobs/', '-inurl:/company/', '-inurl:/learning/', '-inurl:/salary/', '-inurl:/school/']) {
        if (!s.includes(ex)) s = `${ex} ${s}`
      }
      return s.replace(/\s+/g, ' ').trim()
    }

    for (const raw of queries) {
      if (job.results.length >= limit) break
      if (job._cancel) { job.status = 'canceled'; job.updatedAt = Date.now(); return }
      const q = normalize(raw)
      let fetchedForQ = 0
      // Google CSE returns up to 10 per page; paginate up to perQuery (start=1,11,21,...)
      for (let start = 1; start <= 91 && fetchedForQ < perQuery && job.results.length < limit; start += 10) {
        if (job._cancel) { job.status = 'canceled'; job.updatedAt = Date.now(); return }
        let items: Result[] = []
        while (true) {
          try {
            items = await cseSearch(q, start)
            break
          } catch (e: any) {
            if (e instanceof CSERateLimitError) {
              const wait = Math.max(3000, Math.min(e.retryAfterMs || 60000, 60000))
              job.pausedUntil = Date.now() + wait
              job.note = `Rate limited. Retrying in ${Math.ceil(wait/1000)}s...`
              job.updatedAt = Date.now()
              await new Promise((r) => setTimeout(r, wait))
              continue
            }
            throw e
          }
        }
        job.totalFetched += items.length
        fetchedForQ += items.length
        for (const it of items) {
          if (job.results.length >= limit) break
          if (!job._seen.has(it.link)) {
            job._seen.add(it.link)
            job.results.push(it)
          }
        }
        job.updatedAt = Date.now()
        // Light throttle to avoid bursts (approx < 80 req/min)
        await new Promise((r) => setTimeout(r, 700))
        if (items.length < 10) break
      }
      job.perQuery.push({ q, fetched: fetchedForQ })
    }

    job.status = 'complete'
    job.updatedAt = Date.now()
  } catch (e: any) {
    job.status = 'error'
    job.error = e?.message || 'error'
    job.updatedAt = Date.now()
  }
}
