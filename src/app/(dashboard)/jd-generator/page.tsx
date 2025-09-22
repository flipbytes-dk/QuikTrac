'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function JDGeneratorPage() {
  const [title, setTitle] = useState('Software Engineer')
  const [seniority, setSeniority] = useState('Mid')
  const [skills, setSkills] = useState('TypeScript, React, Node.js')
  const [location, setLocation] = useState('Remote (India)')
  const [comp, setComp] = useState('Market competitive; base + bonus')
  const [domain, setDomain] = useState('HR Tech')
  const [tone, setTone] = useState<'neutral' | 'friendly' | 'formal'>('neutral')
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  const [loading, setLoading] = useState(false)
  const [md, setMd] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jd-form')
      if (raw) {
        const s = JSON.parse(raw)
        setTitle(s.title ?? title)
        setSeniority(s.seniority ?? seniority)
        setSkills(s.skills ?? skills)
        setLocation(s.location ?? location)
        setComp(s.comp ?? comp)
        setDomain(s.domain ?? domain)
        setTone(s.tone ?? tone)
        setAdditionalInstructions(s.additionalInstructions ?? additionalInstructions)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const s = { title, seniority, skills, location, comp, domain, tone, additionalInstructions }
    try { localStorage.setItem('jd-form', JSON.stringify(s)) } catch {}
  }, [title, seniority, skills, location, comp, domain, tone, additionalInstructions])

  async function onGenerate() {
    setError(null)
    setLoading(true)
    setMd('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const res = await fetch('/api/jd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, seniority, skills, location, comp, domain, tone, additionalInstructions }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setError('Your session is missing or expired. Please sign in again.')
        } else {
          setError(data?.error || 'Failed to generate')
        }
        return
      }
      setMd(String(data?.markdown || ''))
    } catch (_e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!md) return
    navigator.clipboard?.writeText(md).catch(() => {})
  }

  function downloadMd() {
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '-')}-JD.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">JD Generator</h1>
        <p className="text-[#172233]/85">Compose job descriptions. Use the form and generate Markdown.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="title">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="seniority">Seniority</label>
              <Input
                id="seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="location">Location</label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="skills">Skills (comma separated)</label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="comp">Compensation</label>
            <Input
              id="comp"
              value={comp}
              onChange={(e) => setComp(e.target.value)}
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="domain">Domain</label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <select
                className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-white/70 px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-zinc-900/50"
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
              >
                <option value="neutral">Neutral</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="additionalInstructions">
              Additional Instructions
            </label>
            <Textarea
              id="additionalInstructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Add any specific requirements, client instructions, or additional details that should be included in the job description..."
              className="min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Optional: Include any client requirements, email instructions, or specific details to customize the job description.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              onClick={onGenerate}
              disabled={loading}
              className="w-full sm:w-auto focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  Generating…
                </span>
              ) : (
                'Generate'
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={copyToClipboard}
              disabled={!md || loading}
              className="w-full sm:w-auto focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Copy
            </Button>
            <Button
              variant="secondary"
              onClick={downloadMd}
              disabled={!md || loading}
              className="w-full sm:w-auto focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Download .md
            </Button>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-4 shadow-md backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/70 lg:p-6">
          <div className="mb-4 text-sm font-medium">Preview</div>
          <div className="h-[400px] overflow-auto rounded-lg bg-white/70 p-4 font-mono text-sm dark:bg-zinc-900/50 lg:h-[520px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
                <span className="ml-3">Generating…</span>
              </div>
            ) : md ? (
              <pre className="whitespace-pre-wrap break-words">{md}</pre>
            ) : (
              <div className="text-[hsl(var(--muted-foreground))]">No output yet. Fill the form and click Generate.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
