import { buildJDPrompt } from './jd'

describe('buildJDPrompt', () => {
  it('includes key fields and sections', () => {
    const messages = buildJDPrompt({
      title: 'Data Engineer',
      seniority: 'Senior',
      skills: ['Python', 'ETL'],
      location: 'Remote',
      comp: 'INR 40–60 LPA',
      domain: 'Analytics',
      tone: 'formal',
    })
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessage = messages.find(m => m.role === 'user')

    expect(systemMessage?.content).toMatch(/inclusive/i)
    expect(userMessage?.content).toMatch(/Data Engineer/)
    expect(userMessage?.content).toMatch(/Responsibilities/)
    expect(userMessage?.content).toMatch(/Requirements/)
    expect(userMessage?.content).toMatch(/Nice to Have/)
  })
})
