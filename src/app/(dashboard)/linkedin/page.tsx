'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function LinkedInPassiveSearchPage() {
  const router = useRouter()
  const [jobDescription, setJobDescription] = useState('')
  const [custom, setCustom] = useState('')
  const [queries, setQueries] = useState<string>('')

  const JD_PLACEHOLDER = 'Paste job description here...'

  function clearLinkedinState() {
    try {
      ;['linkedin_jd','linkedin_custom','linkedin_queries','linkedin_search_opts','linkedin_job_id','linkedin_saved_at'].forEach(k => localStorage.removeItem(k))
    } catch {}
  }

  // Restore persisted inputs (scoped to current user token + TTL)
  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token') || ''
      const fp = token ? token.slice(0, 12) : 'anon'
      const savedFp = localStorage.getItem('linkedin_owner_fp') || ''
      if (!savedFp || savedFp !== fp) {
        clearLinkedinState()
        localStorage.setItem('linkedin_owner_fp', fp)
        return
      }
      const savedAt = Number(localStorage.getItem('linkedin_saved_at') || '0')
      const maxAgeMs = 3 * 24 * 60 * 60 * 1000 // 3 days
      if (!savedAt || Date.now() - savedAt > maxAgeMs) {
        clearLinkedinState()
        return
      }
      const jd = localStorage.getItem('linkedin_jd') || ''
      const ci = localStorage.getItem('linkedin_custom') || ''
      const qs = localStorage.getItem('linkedin_queries') || ''
      if (jd) setJobDescription(jd)
      if (ci) setCustom(ci)
      // Only restore queries if we also have JD/Custom to avoid confusion
      if ((jd || ci) && qs) setQueries(qs)
    } catch {}
  }, [])

  function persist(key: string, val: string) {
    try {
      localStorage.setItem(key, val)
      localStorage.setItem('linkedin_saved_at', String(Date.now()))
    } catch {}
  }

  // Persist on change (ignore empty/noise)
  useEffect(() => { if (jobDescription.trim()) persist('linkedin_jd', jobDescription) }, [jobDescription])
  useEffect(() => { if (custom.trim()) persist('linkedin_custom', custom) }, [custom])
  useEffect(() => { if (queries.trim()) persist('linkedin_queries', queries) }, [queries])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFull, setShowFull] = useState(false)

  const prefix = 'site:linkedin.com/in'
  const excludes = ['-inurl:/jobs/', '-inurl:/company/', '-inurl:/learning/', '-inurl:/salary/', '-inurl:/school/']
  function normalize(q: string): string {
    let s = q.trim()
    if (!/site:linkedin\.com\/in/i.test(s)) s = `${prefix} ${s}`
    for (const ex of excludes) { if (!s.includes(ex)) s = `${ex} ${s}` }
    return s.replace(/\s+/g, ' ').trim()
  }
  const previewLines = useMemo(() => {
    const arr = queries.split('\n').map(s=>s.trim()).filter(Boolean)
    return showFull ? arr.map(normalize) : arr
  }, [queries, showFull])

  async function onGenerateQueries() {
    setError(null)
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/linkedin/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ job_description: jobDescription, custom_instructions: custom }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Prompt failed')
        return
      }
      // Persist the inputs used to generate
      if (jobDescription.trim()) persist('linkedin_jd', jobDescription)
      if (custom.trim()) persist('linkedin_custom', custom)
      const qs = (data.queries || []).join('\n')
      setQueries(qs)
      persist('linkedin_queries', qs)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function onRunQueries() {
    setError(null)
    const arr = queries.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!arr.length) return
    try {
      // Persist queries and opts for results page
      localStorage.setItem('linkedin_queries', arr.join('\n'))
      localStorage.setItem('linkedin_search_opts', JSON.stringify({ perQuery: 100, limit: 1000 }))
      // Clear any previous job id so a fresh run starts
      localStorage.removeItem('linkedin_job_id')
      router.push('/linkedin/results')
    } catch {
      setError('Unable to navigate to results')
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Passive Search (LinkedIn)</h1>
        <p className="text-[#172233]/85">Search public LinkedIn profiles via Google CSE.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="jd">Job Description</label>
            <textarea id="jd" placeholder={JD_PLACEHOLDER} className="h-40 w-full rounded-lg border border-[hsl(var(--border))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="custom">Custom Instructions (optional)</label>
            <textarea id="custom" className="h-24 w-full rounded-lg border border-[hsl(var(--border))] bg-white/70 p-3 text-sm dark:bg-zinc-900/50" value={custom} onChange={(e) => setCustom(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={onGenerateQueries} disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  Generating…
                </span>
              ) : 'Generate queries'}
            </Button>
            <Button variant="secondary" onClick={onRunQueries} disabled={loading || !queries.trim()}>Run queries</Button>
          </div>
          {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>Queries (editable)</span>
              <label className="flex items-center gap-2 text-xs font-normal">
                <input type="checkbox" checked={showFull} onChange={(e)=>setShowFull(e.target.checked)} /> Show full query (adds site: + exclusions)
              </label>
            </div>
            <textarea className="h-80 w-full rounded-lg border border-[hsl(var(--border))] bg-white/70 p-3 font-mono text-xs dark:bg-zinc-900/50" value={queries} onChange={(e) => setQueries(e.target.value)} placeholder={'site:linkedin.com/in ...'} />
            {/* Query preview blocks */}
            {queries.trim() ? (
              <ul className="mt-3 space-y-2">
                {previewLines.map((q, i) => (
                  <li key={i} className="rounded-lg border border-[hsl(var(--border))] bg-white/60 p-2 font-mono text-[11px] dark:bg-zinc-900/50">
                    <span className="mr-2 rounded bg-[hsl(var(--accent))] px-1 py-0.5 text-[10px]">{i + 1}</span>
                    <span className="break-words">{q}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-white/60 p-4 text-sm dark:bg-zinc-900/50">
              Results will open on a separate page. Click Run queries above to view them.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
