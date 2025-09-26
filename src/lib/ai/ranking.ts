import { chatComplete, type ChatMessage } from '@/lib/ai/openai'
import { getEnv } from '@/lib/env'
import { buildRankingMessages, buildLinkedInRankingMessages, buildResumeRankingMessages } from '@/lib/ai/prompts'

export interface CandidateInput {
  id: string
  linkedin_url?: string
  full_name?: string
  first_name?: string
  last_name?: string
  headline?: string
  about?: string
  email?: string | null
  phone?: string | null
  current_title?: string | null
  current_company?: string | null
  current_duration_years?: number | null
  location?: string | null
  country?: string | null
  connections?: number | null
  followers?: number | null
  skills_top?: string[]
  skills_all?: string[]
  companies_worked?: Array<{ company?: string; title?: string; start?: string; end?: string }>
  roles_timeline?: any[]
  educations?: any[]
  certificates?: any[]
  projects?: any[]
  recommendations_received?: number | null
  recommendations_received_text?: string[]
  // Additional fields for resume parsing
  titles?: string[]
  totalExpMonths?: number
}

export interface RankingResult {
  raw: string
  json?: any
  durationMs: number
  modelTried: string[]
}

export async function rankOne({ jd, instructions, candidate }: { jd: string; instructions?: string; candidate: CandidateInput }): Promise<RankingResult> {
  const start = Date.now()

  // Use ranking-specific model or fall back to environment defaults
  const env = getEnv()
  const models = [
    env.OPENAI_RANKING_MODEL || env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    'gpt-4o-mini' // Fallback to faster model
  ].filter(Boolean)

  const messages = buildRankingMessages(jd, instructions, candidate)
  const raw = await chatComplete(messages as ChatMessage[], models)
  const parsed = extractJson(raw)

  return { raw, json: parsed, durationMs: Date.now() - start, modelTried: models }
}

export async function rankOneLinkedIn({ jd, instructions, candidate }: { jd: string; instructions?: string; candidate: CandidateInput }): Promise<RankingResult> {
  const start = Date.now()

  // Use ranking-specific model or fall back to environment defaults
  const env = getEnv()
  const models = [
    env.OPENAI_RANKING_MODEL || env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    'gpt-4o-mini' // Fallback to faster model
  ].filter(Boolean)

  const messages = buildLinkedInRankingMessages(jd, instructions, candidate)
  const raw = await chatComplete(messages as ChatMessage[], models)
  const parsed = extractJson(raw)

  return { raw, json: parsed, durationMs: Date.now() - start, modelTried: models }
}

export async function rankOneResume({ jd, instructions, candidate }: { jd: string; instructions?: string; candidate: CandidateInput }): Promise<RankingResult> {
  const start = Date.now()

  // Use ranking-specific model or fall back to environment defaults
  const env = getEnv()
  const models = [
    env.OPENAI_RANKING_MODEL || env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    'gpt-4o-mini' // Fallback to faster model
  ].filter(Boolean)

  const messages = buildResumeRankingMessages(jd, instructions, candidate)
  const raw = await chatComplete(messages as ChatMessage[], models)
  const parsed = extractJson(raw)

  return { raw, json: parsed, durationMs: Date.now() - start, modelTried: models }
}

export async function rankManyConcurrent(items: Array<{ jd: string; instructions?: string; candidate: CandidateInput }>, concurrency = 5) {
  const results: RankingResult[] = []
  const diag: { maxConcurrent: number; timeline: Array<{ t: number; inFlight: number }> } = { maxConcurrent: 0, timeline: [] }
  let inFlight = 0
  const queue = items.slice()
  async function worker() {
    while (queue.length) {
      const item = queue.shift()!
      inFlight++
      diag.maxConcurrent = Math.max(diag.maxConcurrent, inFlight)
      diag.timeline.push({ t: Date.now(), inFlight })
      try {
        const r = await rankOne(item)
        results.push(r)
      } finally {
        inFlight--
        diag.timeline.push({ t: Date.now(), inFlight })
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return { results, diag }
}

export async function rankManyLinkedInConcurrent(items: Array<{ jd: string; instructions?: string; candidate: CandidateInput }>, concurrency = 5) {
  const results: RankingResult[] = []
  const diag: { maxConcurrent: number; timeline: Array<{ t: number; inFlight: number }> } = { maxConcurrent: 0, timeline: [] }
  let inFlight = 0
  const queue = items.slice()
  async function worker() {
    while (queue.length) {
      const item = queue.shift()!
      inFlight++
      diag.maxConcurrent = Math.max(diag.maxConcurrent, inFlight)
      diag.timeline.push({ t: Date.now(), inFlight })
      try {
        const r = await rankOneLinkedIn(item)
        results.push(r)
      } finally {
        inFlight--
        diag.timeline.push({ t: Date.now(), inFlight })
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return { results, diag }
}

export async function rankManyResumeConcurrent(items: Array<{ jd: string; instructions?: string; candidate: CandidateInput }>, concurrency = 5) {
  const results: RankingResult[] = []
  const diag: { maxConcurrent: number; timeline: Array<{ t: number; inFlight: number }> } = { maxConcurrent: 0, timeline: [] }
  let inFlight = 0
  const queue = items.slice()
  async function worker() {
    while (queue.length) {
      const item = queue.shift()!
      inFlight++
      diag.maxConcurrent = Math.max(diag.maxConcurrent, inFlight)
      diag.timeline.push({ t: Date.now(), inFlight })
      try {
        const r = await rankOneResume(item)
        results.push(r)
      } finally {
        inFlight--
        diag.timeline.push({ t: Date.now(), inFlight })
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return { results, diag }
}

function extractJson(text: string): any | undefined {
  try { return JSON.parse(text) } catch {}
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1)
    try { return JSON.parse(slice) } catch {}
  }
  return undefined
}