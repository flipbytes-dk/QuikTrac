'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Result { title: string; link: string; snippet?: string }
interface PerQueryStat { q: string; fetched: number }

function PaginatedResults({ items, pageSize = 10, onPageSelectionChange, selected }: { items: Result[]; pageSize?: number; onPageSelectionChange?: (pageItems: string[], checked: boolean) => void; selected?: Set<string> }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const start = (page - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  useEffect(() => {
    // reset to first page on new data
    setPage(1)
  }, [items])
  const pageLinks = slice.map(s => s.link)
  const allChecked = selected ? pageLinks.every(l => selected.has(l)) : false
  const someChecked = selected ? pageLinks.some(l => selected.has(l)) : false
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <input id="select-page" type="checkbox" checked={allChecked} onChange={(e)=> onPageSelectionChange?.(pageLinks, e.target.checked)} />
          <label htmlFor="select-page">Select page</label>
          {someChecked && !allChecked ? <span className="text-[hsl(var(--muted-foreground))]">(partial)</span> : null}
        </div>
        <div className="space-x-2">
          <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>Prev</button>
          <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page>=pages} onClick={()=>setPage((p)=>Math.min(pages,p+1))}>Next</button>
        </div>
      </div>
      <ul className="space-y-3">
        {slice.map((r) => (
          <li key={r.link} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-4 shadow-sm">
            <input type="checkbox" checked={selected?.has(r.link) ?? true} onChange={(e)=> onPageSelectionChange?.([r.link], e.target.checked)} />
            <div>
              <a className="font-medium underline" href={r.link} target="_blank" rel="noreferrer noopener">{r.title || r.link}</a>
              {r.snippet ? <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{r.snippet}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-[hsl(var(--muted-foreground))]">Page {page} / {pages}</div>
        <div className="space-x-2">
          <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>Prev</button>
          <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page>=pages} onClick={()=>setPage((p)=>Math.min(pages,p+1))}>Next</button>
        </div>
      </div>
    </div>
  )
}

export default function LinkedInResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [totalFetched, setTotalFetched] = useState(0)
  const [perQueryStats, setPerQueryStats] = useState<PerQueryStat[]>([])
  const [status, setStatus] = useState<'pending'|'running'|'complete'|'error'|'canceled'|null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const startedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [jobCode, setJobCode] = useState<string>('')
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)
  const isJobCodeValid = useMemo(() => /^\s*JPC\s*-\s*\d+\s*$/i.test(jobCode), [jobCode])
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState(false)
  const [ranking, setRanking] = useState(false)

  const storedQueries = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('linkedin_queries') || ''
  }, [])

  const queriesArr = useMemo(() => storedQueries.split('\n').map((s) => s.trim()).filter(Boolean), [storedQueries])

  useEffect(() => {
    async function ensureJobAndPoll() {
      if (!queriesArr.length) return
      if (startedRef.current) return
      startedRef.current = true
      setLoading(true)
      setError(null)
      try {
        let id = localStorage.getItem('linkedin_job_id')
        if (!id) {
          const rawOpts = localStorage.getItem('linkedin_search_opts')
          const opts = rawOpts ? JSON.parse(rawOpts) as { perQuery?: number; limit?: number } : {}
          const token = localStorage.getItem('access_token')
          const res = await fetch('/api/linkedin/search/job/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ queries: queriesArr, perQuery: opts.perQuery ?? 100, limit: opts.limit ?? 1000 }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data?.error || 'start_failed')
            setLoading(false)
            startedRef.current = false
            return
          }
          id = data.jobId
          localStorage.setItem('linkedin_job_id', id as string)
        }
        setJobId(id)
        // default-select all links
        setSelected(new Set(queriesArr.length ? [] : []))

        const poll = async () => {
          if (!id) return
          const jid: string = id
          const token = localStorage.getItem('access_token')
          const res = await fetch(`/api/linkedin/search/job/status?id=${encodeURIComponent(jid)}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
          const data = await res.json()
          if (!res.ok) {
            if (res.status === 404) {
              // Job not found (likely server reload). Start a new job once.
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
              localStorage.removeItem('linkedin_job_id')
              setJobId(null)
              setStatus(null)
              setResults([])
              setTotalFetched(0)
              setPerQueryStats([])
              startedRef.current = false
              await ensureJobAndPoll()
              return
            }
            setError(data?.error || 'status_failed')
            setLoading(false)
            return
          }
          setStatus(data.status)
          setTotalFetched(data.totalFetched || 0)
          const newResults: Result[] = Array.isArray(data.results) ? data.results : []
          setResults(newResults)
          setPerQueryStats(Array.isArray(data.perQuery) ? data.perQuery : [])
          // Default select all once when results arrive
          if (newResults.length && selected.size === 0) {
            setSelected(new Set(newResults.map(r => r.link)))
          }
          if (data.status === 'error') {
            setError(data.error || 'Search job failed')
          }
          if (data.status === 'canceled') {
            setError('Search canceled')
          }
          if (data.status === 'complete' || data.status === 'error' || data.status === 'canceled') {
            setLoading(false)
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
          }
        }
        await poll()
        timerRef.current = setInterval(poll, 2000)
      } catch (e) {
        setError('Network error')
        setLoading(false)
        startedRef.current = false
      }
    }
    ensureJobAndPoll()
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  // Note: we intentionally do not add `selected.size` to deps to avoid resetting poller when user interacts with checkboxes
  }, [queriesArr])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LinkedIn Results</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Aggregated results from your queries.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="jobCode">Job Code</label>
            <input id="jobCode" placeholder="JPC - 12345" className="rounded border px-2 py-1" value={jobCode} onChange={(e)=>setJobCode(e.target.value)} />
          </div>
          <button className="rounded-md border px-3 py-1 text-sm" onClick={() => router.push('/linkedin')}>Back to search</button>
          {jobId ? <span className="text-xs text-[hsl(var(--muted-foreground))]">Job: {jobId.slice(0,10)}… · {status || '—'}</span> : null}
        </div>
      </div>

      {!queriesArr.length ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-yellow-50 p-4 text-sm text-yellow-900">
          No queries found. Go back to the search page to generate or paste queries.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {String(error)}
          <button className="ml-3 rounded border px-2 py-0.5 text-xs" onClick={() => { localStorage.removeItem('linkedin_job_id'); location.reload(); }}>Retry</button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50">
          <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Total fetched</div>
          <div className="text-xl font-semibold">{totalFetched}</div>
        </div>
        <div className="rounded-xl border border-[hsl(var(--muted-foreground))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50">
          <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Unique after dedupe</div>
          <div className="text-xl font-semibold">{results.length}</div>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50">
          <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Queries</div>
          <div className="text-xl font-semibold">{queriesArr.length}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50">
        <details>
          <summary className="cursor-pointer select-none font-medium">Per-query breakdown</summary>
          <ul className="mt-2 space-y-2">
            {perQueryStats.map((s, i) => (
              <li key={i} className="rounded border p-2">
                <div className="mb-1 text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Query {i + 1} · fetched {s.fetched}</div>
                <div className="font-mono text-[11px] text-wrap break-words">{s.q}</div>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          <span className="mr-2">Selected: {selected.size}</span>
          <button className="rounded-md border px-2 py-1" onClick={()=> setSelected(new Set(results.map(r=>r.link)))}>Select all</button>
          <button className="ml-2 rounded-md border px-2 py-1" onClick={()=> setSelected(new Set())}>Clear</button>
        </div>
        <div>
          <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={scraping || !isJobCodeValid || selected.size===0} onClick={async()=>{
          setScrapeMessage(null)
          setScraping(true)
          try {
          const token = localStorage.getItem('access_token')
          const digits = jobCode.match(/\d+/)?.[0]
          const jobCodeNormalized = digits ? `JPC - ${digits}` : jobCode.trim()
          const res = await fetch('/api/linkedin/scrape', {
          method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ jobCode: jobCodeNormalized, urls: Array.from(selected) }),
          })
          const data = await res.json()
            if (!res.ok) { setScrapeMessage(`${data?.error || 'Scrape failed'}${data?.requestId ? ' · req ' + data.requestId : ''}`); setScraped(false); return }
              setScrapeMessage(`Queued ${data.sent} new URLs; ${data.skipped} skipped (existing). Saved: ${data.saved}${data?.requestId ? ' · req ' + data.requestId : ''}`)
              setScraped(true)
            } catch { setScrapeMessage('Network error') } finally { setScraping(false) }
          }}>{scraping ? (
            <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200"/> Scraping…</span>
          ) : 'Start scraping'}</button>
        </div>
      </div>

      {scrapeMessage ? (
        <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{scrapeMessage}</div>
      ) : null}

      {/* Proceed to ranking (only after search complete and scraping success) */}
      {status === 'complete' && scraped ? (
        <div className="mt-3 flex items-center justify-end">
          <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={ranking || results.length===0 || selected.size===0 || !isJobCodeValid} onClick={async()=>{
            setScrapeMessage(null)
            setRanking(true)
            try {
              const token = localStorage.getItem('access_token')
              const digits = jobCode.match(/\d+/)?.[0]
              const jobCodeNormalized = digits ? `JPC - ${digits}` : jobCode.trim()
              const jd = localStorage.getItem('linkedin_jd') || ''
              const instructions = localStorage.getItem('linkedin_custom') || ''
              const res = await fetch('/api/linkedin/rank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ jobCode: jobCodeNormalized, urls: Array.from(selected), jd, instructions, concurrency: 5 })
              })
              const data = await res.json()
              if (!res.ok) { setScrapeMessage(`${data?.error || 'Ranking failed'}${data?.requestId ? ' · req ' + data.requestId : ''}`); return }
              setScrapeMessage(`Ranked ${data.ranked}, saved ${data.saved}. Concurrency peak: ${data?.diag?.maxConcurrent || '?'}${data?.requestId ? ' · req ' + data.requestId : ''}`)
            } catch { setScrapeMessage('Network error') } finally { setRanking(false) }
          }}>{ranking ? (
            <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200"/> Ranking…</span>
          ) : 'Proceed to ranking'}</button>
        </div>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-[hsl(var(--muted-foreground))]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
            <span className="ml-3">Gathering results…</span>
          </div>
        ) : results.length ? (
          <PaginatedResults items={results} pageSize={10} selected={selected} onPageSelectionChange={(links, checked)=>{
            setSelected(prev => {
              const next = new Set(prev)
              for (const l of links) { if (checked) next.add(l); else next.delete(l) }
              return next
            })
          }} />
        ) : (
          <div className="text-[hsl(var(--muted-foreground))]">No results to display.</div>
        )}
      </div>
    </div>
  )
}
