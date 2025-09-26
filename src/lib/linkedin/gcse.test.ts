import { buildQueries } from './gcse'

describe('buildQueries', () => {
  it('builds site-restricted queries with terms', () => {
    const qs = buildQueries({ title: 'Data Engineer', skills: ['Python', 'ETL'], location: 'Bengaluru', seniority: 'Senior' })
    expect(qs.length).toBeGreaterThan(1)
    expect(qs[0]).toMatch(/site:linkedin\.com\/in/)
    expect(qs[0]).toMatch(/"Data Engineer"/)
    expect(qs[0]).toMatch(/Senior/)
    expect(qs[0]).toMatch(/Bengaluru/)
  })
})
