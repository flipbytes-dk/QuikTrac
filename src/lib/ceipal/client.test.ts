import CeipalClient from './client'

// Helper to build a minimal fetch Response-like object (no DOM Response in Jest env)
function jsonResponse(body: any, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200
  const contentType = init.headers?.['content-type'] || 'application/json'
  const headers = {
    get(name: string) {
      if (name.toLowerCase() === 'content-type') return contentType
      return ''
    },
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    async json() {
      return body
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body)
    },
  } as any
}

describe('CeipalClient', () => {
  const creds = { email: 'user@example.com', password: 'secret', apiKey: 'key-123' }

  test('login + simple GET', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ access_token: 'at1', token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt1' })
      }
      if (url.includes('/job-postings')) {
        expect(init?.headers).toBeDefined()
        const headers = init!.headers as Record<string, string>
        expect(headers['authorization']).toContain('Bearer at1')
        expect(headers['x-api-key']).toBe('key-123')
        return jsonResponse([])
      }
      throw new Error(`Unhandled URL ${url}`)
    }

    const client = new CeipalClient({ baseUrl: 'https://api.ceipal.com/v1', ...creds, fetchImpl })
    const jobs = await client.listJobPostingsByStatusNames(['Active'])
    expect(Array.isArray(jobs)).toBe(true)
  })

  test('401 triggers refresh and retry', async () => {
    let loginCount = 0
    let refreshCount = 0
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) {
        loginCount++
        return jsonResponse({ access_token: 'at-login', token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt-login' })
      }
      if (url.endsWith('/auth/refresh')) {
        refreshCount++
        return jsonResponse({ access_token: 'at-ref', token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt-ref' })
      }
      if (url.includes('/job-postings')) {
        const headers = init!.headers as Record<string, string>
        if (headers['authorization']?.includes('at-login')) {
          // First attempt with old token fails
          return jsonResponse({ error: 'expired' }, { status: 401 })
        }
        if (headers['authorization']?.includes('at-ref')) {
          // After refresh succeeds
          return jsonResponse([{ id: 1 }])
        }
      }
      throw new Error(`Unhandled URL ${url}`)
    }

    const client = new CeipalClient({ baseUrl: 'https://api.ceipal.com/v1', ...creds, fetchImpl })
    const result = await client.listJobPostingsByStatusNames(['Active'])
    expect(result).toHaveLength(1)
    expect(loginCount).toBe(1)
    expect(refreshCount).toBe(1)
  })

  test('pagination: listAllJobPostingsByStatusNames', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const u = new URL(url)
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ access_token: 'at1', token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt1' })
      }
      if (u.pathname.endsWith('/job-postings')) {
        const page = Number(u.searchParams.get('page') || '1')
        const perPage = Number(u.searchParams.get('per_page') || '50')
        if (page === 1) return jsonResponse(Array.from({ length: perPage }, (_, i) => ({ id: i + 1 })))
        if (page === 2) return jsonResponse([{ id: perPage + 1 }]) // shorter page ends loop
        return jsonResponse([])
      }
      throw new Error(`Unhandled URL ${url}`)
    }

    const client = new CeipalClient({ baseUrl: 'https://api.ceipal.com/v1', ...creds, fetchImpl })
    const items = await client.listAllJobPostingsByStatusNames(['Active'], 10, 5)
    expect(items.length).toBe(11)
  })

  test('getActiveOpenJobs uses master data to pick Active/Open names', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const u = new URL(url)
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ access_token: 'at1', token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt1' })
      }
      if (u.pathname.endsWith('/master-data/job-statuses')) {
        return jsonResponse([
          { id: 1, name: 'Active' },
          { id: 2, name: 'Open' },
          { id: 3, name: 'Closed' },
        ])
      }
      if (u.pathname.endsWith('/master-data/job-statuses')) {
        return jsonResponse([
          { id: 1, name: 'Active' },
          { id: 2, name: 'Open' },
          { id: 3, name: 'Closed' },
        ])
      }
      if (u.pathname.endsWith('/getJobPostingsList/')) {
        const ids = u.searchParams.get('job_status')
        expect(ids).toBe('1,2')
        expect(u.searchParams.get('page')).toBe('1')
        expect(u.searchParams.get('limit')).toBe('50')
        return jsonResponse({
          count: 2,
          num_pages: 1,
          limit: 50,
          page_number: 1,
          page_count: 2,
          next: null,
          previous: null,
          results: [{ id: 10, job_code: 'JPC - 123' }, { id: 11, job_code: 'JPC - 456' }],
        })
      }
      throw new Error(`Unhandled URL ${url}`)
    }

    const client = new CeipalClient({ baseUrl: 'https://api.ceipal.com/v1', ...creds, fetchImpl })
    const jobs = await client.getActiveOpenJobs()
    expect(jobs.length).toBe(2)
  })
})
