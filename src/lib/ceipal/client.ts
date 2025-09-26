/*
Ceipal API client (v1)
- Auth: email + password + API key → access_token + refresh_token
- Auto-refresh and retry on 401/expired
- Job postings pagination via results/next links

Docs: https://developer.ceipal.com/ceipal-ats-version-one/authentication
*/

import { getEnv } from '@/lib/env'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface CeipalAuthResponse {
  access_token: string
  token_type: 'Bearer' | string
  expires_in: number // seconds
  refresh_token: string
}

export interface CeipalClientOptions {
  baseUrl?: string
  email?: string
  password?: string
  apiKey?: string
  fetchImpl?: typeof fetch
}

interface TokenState {
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: number | null // epoch ms
}

export class CeipalClient {
  private baseUrl: string
  private email: string
  private password: string
  private apiKey: string
  private fetchImpl: typeof fetch

  public static readonly DEFAULT_LIMIT = 50

  private token: TokenState = {
    accessToken: null,
    refreshToken: null,
    accessTokenExpiresAt: null,
  }

  private refreshing: Promise<void> | null = null

  constructor(opts: CeipalClientOptions = {}) {
    const env = getEnv()
    this.baseUrl = (opts.baseUrl || env.CEIPAL_BASE_URL || 'https://api.ceipal.com/v1').replace(/\/$/, '')
    this.email = opts.email || env.CEIPAL_EMAIL || env.CEIPAL_USERNAME || ''
    this.password = opts.password || (env.CEIPAL_PASSWORD as unknown as string) || ''
    this.apiKey = opts.apiKey || (env.CEIPAL_API_KEY as unknown as string) || ''
    this.fetchImpl = opts.fetchImpl || fetch

    // Seed token from env if provided, to avoid login endpoint differences
    if (env.CEIPAL_ACCESS_TOKEN) {
      const skew = 10
      // If expiry unknown, set short window to force refresh path later
      const approx = Date.now() + 60 * 60 * 1000 - skew * 1000
      this.token.accessToken = env.CEIPAL_ACCESS_TOKEN as string
      this.token.accessTokenExpiresAt = approx
      this.token.refreshToken = (env.CEIPAL_REFRESH_TOKEN as string) || null
    }
  }

  setCredentials({ email, password, apiKey }: { email?: string; password?: string; apiKey?: string }) {
    if (email) this.email = email
    if (password) this.password = password
    if (apiKey) this.apiKey = apiKey
  }

  async login(): Promise<void> {
    const url = `${this.baseUrl}/createAuthtoken`
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: this.email, password: this.password, api_key: this.apiKey }),
    })
    if (!res.ok) {
      const text = await safeText(res)
      throw new Error(`Ceipal login failed ${res.status}: ${text}`)
    }

    // Ceipal auth endpoint returns XML, not JSON
    const text = await res.text()
    const data = this.parseXmlResponse(text) as CeipalAuthResponse
    this.setTokenFromAuth(data)
  }

  private async refresh(): Promise<void> {
    if (!this.token.refreshToken) {
      await this.login()
      return
    }
    const url = `${this.baseUrl}/refreshToken/`
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${this.token.accessToken}`,
      },
      body: JSON.stringify({ refresh_token: this.token.refreshToken }),
    })
    if (!res.ok) {
      await this.login()
      return
    }
    // Ceipal refresh endpoint may also return XML
    const text = await res.text()
    const data = this.parseXmlResponse(text) as CeipalAuthResponse
    this.setTokenFromAuth(data)
  }

  private setTokenFromAuth(data: CeipalAuthResponse) {
    const skew = 20
    const expiresAt = Date.now() + Math.max(0, data.expires_in - skew) * 1000
    this.token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: expiresAt,
    }
  }

  private get isAccessTokenValid(): boolean {
    const { accessToken, accessTokenExpiresAt } = this.token
    if (!accessToken || !accessTokenExpiresAt) return false
    return Date.now() < accessTokenExpiresAt
  }

  private parseXmlResponse(xmlText: string): any {
    // Simple XML parser for Ceipal auth responses
    try {
      const accessTokenMatch = xmlText.match(/<access_token>(.*?)<\/access_token>/)
      const refreshTokenMatch = xmlText.match(/<refresh_token>(.*?)<\/refresh_token>/)

      if (accessTokenMatch) {
        return {
          access_token: accessTokenMatch[1],
          refresh_token: refreshTokenMatch?.[1] || '',
          token_type: 'Bearer',
          expires_in: 3600 // 1 hour default as per docs
        }
      }

      // If no access_token found, return the raw text
      return xmlText
    } catch (e) {
      return xmlText
    }
  }

  private async ensureAccess(): Promise<void> {
    if (this.isAccessTokenValid) return
    if (this.refreshing) {
      await this.refreshing
      return
    }
    this.refreshing = (async () => {
      try {
        if (this.token.refreshToken) await this.refresh()
        else await this.login()
      } finally {
        this.refreshing = null
      }
    })()
    await this.refreshing
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    await this.ensureAccess()
    const url = this.joinUrl(path)
    let res = await this.fetchImpl(url, {
      method,
      headers: this.buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      await this.refresh()
      res = await this.fetchImpl(url, {
        method,
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    }
    if (!res.ok) {
      const text = await safeText(res)
      throw new Error(`Ceipal ${method} ${path} failed ${res.status}: ${text}`)
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return (await res.json()) as T
    }

    const text = await res.text()

    // Handle XML responses (for authentication endpoints)
    if (contentType.includes('application/xml') || text.trim().startsWith('<?xml')) {
      return this.parseXmlResponse(text) as T
    }

    // Try to parse as JSON if it looks like JSON, otherwise return as text
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text) as T
      } catch {
        return text as unknown as T
      }
    }
    return text as unknown as T
  }

  private async requestAbsolute<T>(url: string, method: HttpMethod = 'GET'): Promise<T> {
    await this.ensureAccess()
    let res = await this.fetchImpl(url, { method, headers: this.buildHeaders() })
    if (res.status === 401) {
      await this.refresh()
      res = await this.fetchImpl(url, { method, headers: this.buildHeaders() })
    }
    if (!res.ok) {
      const text = await safeText(res)
      throw new Error(`Ceipal ${method} ${url} failed ${res.status}: ${text}`)
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return (await res.json()) as T

    const text = await res.text()

    // Handle XML responses (for authentication endpoints)
    if (ct.includes('application/xml') || text.trim().startsWith('<?xml')) {
      return this.parseXmlResponse(text) as T
    }

    // Try to parse as JSON if it looks like JSON, otherwise return as text
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text) as T
      } catch {
        return text as unknown as T
      }
    }
    return text as unknown as T
  }

  private joinUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`
    return `${this.baseUrl}${p}`
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (this.token.accessToken) {
      headers['authorization'] = `Bearer ${this.token.accessToken}`
    } else {
      headers['x-api-key'] = this.apiKey
    }
    return headers
  }

  // Master Data: Job Statuses (DISABLED - endpoint returns 404)
  async getJobStatuses(): Promise<Array<{ id: string | number; name: string; [key: string]: unknown }>> {
    // This endpoint is not available in the actual Ceipal API
    throw new Error('master-data/job-statuses endpoint not available')
  }

  // Job Postings by status IDs (Ceipal uses job_status=1,8; uses GET with query params)
  async listJobPostingsByStatusIds(
    statusIds: Array<string | number>,
    opts?: { page?: number; limit?: number; fromdate?: string; todate?: string }
  ): Promise<{ results: any[]; next?: string }> {
    const q = new URLSearchParams()
    if (statusIds.length) q.set('job_status', statusIds.join(','))
    if (opts?.page) q.set('page', String(opts.page))
    if (opts?.limit) q.set('limit', String(opts.limit))
    if (opts?.fromdate) q.set('fromdate', opts.fromdate)
    if (opts?.todate) q.set('todate', opts.todate)
    const path = q.toString() ? `/getJobPostingsList/?${q.toString()}` : `/getJobPostingsList/`
    const raw = await this.request<any>('GET', path)
    return this.normalizeJobPostingsResponse(raw)
  }

  async listAllJobPostingsByStatusIds(statusIds: Array<string | number>, limit: number = CeipalClient.DEFAULT_LIMIT, maxPages: number = 100, opts?: { fromdate?: string; todate?: string }): Promise<any[]> {
    const first = await this.listJobPostingsByStatusIds(statusIds, { page: 1, limit, fromdate: opts?.fromdate, todate: opts?.todate })
    const acc = [...first.results]
    let next = first.next
    let pages = 1
    while (next && pages < maxPages) {
      const raw = await this.requestAbsolute<any>(next, 'GET')
      const norm = this.normalizeJobPostingsResponse(raw)
      acc.push(...norm.results)
      next = norm.next
      pages += 1
    }
    return acc
  }

  private normalizeJobPostingsResponse<T = any>(res: any): { results: T[]; next?: string } {
    if (Array.isArray(res)) return { results: res as T[] }
    if (res && Array.isArray(res.results)) return { results: res.results as T[], next: res.next }
    if (res && Array.isArray(res.data)) return { results: res.data as T[] }
    return { results: [] }
  }

  // Convenience: Active + Open jobs using known status IDs (master data endpoint not available)
  async getActiveOpenJobs(opts?: { fromdate?: string; todate?: string }): Promise<unknown[]> {
    // Use known IDs for Ceipal: Active=1, Open=8
    // Skip master data lookup since /master-data/job-statuses endpoint returns 404
    return this.listAllJobPostingsByStatusIds([1, 8], CeipalClient.DEFAULT_LIMIT, 100, { fromdate: opts?.fromdate, todate: opts?.todate })
  }

  // Backward-compat by names if needed
  async listJobPostingsByStatusNames(
    statusNames: string[],
    opts?: { page?: number; perPage?: number }
  ): Promise<unknown[]> {
    const q = new URLSearchParams()
    if (statusNames.length) q.set('status', statusNames.join(','))
    if (opts?.page) q.set('page', String(opts.page))
    if (opts?.perPage) q.set('per_page', String(opts.perPage))
    const path = q.toString() ? `/job-postings?${q.toString()}` : `/job-postings`
    const res = await this.request<unknown[] | { data: unknown[] }>('GET', path)
    return Array.isArray(res) ? res : res.data
  }

  async listAllJobPostingsByStatusNames(statusNames: string[], perPage: number = 50, maxPages: number = 50): Promise<unknown[]> {
    const acc: unknown[] = []
    for (let page = 1; page <= maxPages; page++) {
      const batch = await this.listJobPostingsByStatusNames(statusNames, { page, perPage })
      acc.push(...batch)
      if (batch.length < perPage) break
    }
    return acc
  }

  // Submissions API - fetch submissions for a job
  async getSubmissionsList(jobId: string, opts?: { page?: number; limit?: number; modifiedAfter?: string; modifiedBefore?: string }): Promise<{
    count: number;
    num_pages: number;
    limit: number;
    page_number: number;
    page_count: number;
    next?: string;
    previous?: string;
    host?: string;
    results: any[];
  }> {
    const q = new URLSearchParams()
    q.set('job_id', jobId)
    q.set('isPipeline', '1') // Required parameter for pipeline submissions
    if (opts?.page) q.set('page', String(opts.page))
    if (opts?.limit) q.set('limit', String(opts.limit))
    if (opts?.modifiedAfter) q.set('modifiedAfter', opts.modifiedAfter)
    if (opts?.modifiedBefore) q.set('modifiedBefore', opts.modifiedBefore)

    const path = `/getSubmissionsList/?${q.toString()}`
    return this.request<any>('GET', path)
  }

  // Get all submissions for a job (paginated)
  async getAllSubmissionsForJob(jobId: string, limit: number = 20, maxPages: number = 100, filters?: { modifiedAfter?: string; modifiedBefore?: string }): Promise<any[]> {
    const first = await this.getSubmissionsList(jobId, { page: 1, limit, modifiedAfter: filters?.modifiedAfter, modifiedBefore: filters?.modifiedBefore })
    const acc = [...first.results]
    let next = first.next
    let pages = 1

    while (next && pages < maxPages) {
      const raw = await this.requestAbsolute<any>(next, 'GET')
      acc.push(...raw.results)
      next = raw.next
      pages += 1
    }
    return acc
  }

  // Applicant Details API - fetch details for a specific applicant
  async getApplicantDetails(applicantId: string): Promise<any> {
    const q = new URLSearchParams()
    q.set('id', applicantId)

    const path = `/getApplicantDetails/?${q.toString()}`
    const raw = await this.request<any>('GET', path)
    // Normalize: API may return an array or wrap under results/data
    if (Array.isArray(raw)) return raw[0] || null
    if (raw && Array.isArray(raw.results)) return raw.results[0] || null
    if (raw && Array.isArray(raw.data)) return raw.data[0] || null
    return raw
  }

  // Download resume from Ceipal URL
  async downloadResume(resumeUrl: string): Promise<ArrayBuffer> {
    await this.ensureAccess()
    const res = await this.fetchImpl(resumeUrl, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${this.token.accessToken}`
      }
    })

    if (!res.ok) {
      throw new Error(`Failed to download resume: ${res.status} ${res.statusText}`)
    }

    return res.arrayBuffer()
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text()
    return t.slice(0, 2000)
  } catch {
    return ''
  }
}

let singleton: CeipalClient | null = null
export function ceipal(): CeipalClient {
  if (!singleton) singleton = new CeipalClient()
  return singleton
}

export default CeipalClient
