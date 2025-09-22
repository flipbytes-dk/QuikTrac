'use client'

import { useState } from 'react'

export default function ShortlistPage() {
  const [jobCode, setJobCode] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  async function fetchShortlist() {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const digits = jobCode.match(/\d+/)?.[0]
      const jobCodeNormalized = digits ? `JPC - ${digits}` : jobCode.trim()
      const res = await fetch(`/api/linkedin/shortlist?jobCode=${encodeURIComponent(jobCodeNormalized)}&page=${page}&pageSize=${pageSize}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'fetch_failed')
      setItems(data.items || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  function buildWhatsAppDraft(it: any) {
    const name = it.firstName || it.fullName || 'there'
    const role = it.jobTitle || 'an AI Architect role'
    const code = jobCode
    return `Hi ${name}, we’re considering you for ${role} (${code}). Your experience in ${it.headline || 'AI/ML and cloud'} looks aligned with the role. If interested, could you please share your current CTC (fixed + variable) and expected CTC, notice period, and preferred location? Thanks!`
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#172233]">Shortlisted candidates</h1>
        <p className="text-[#172233]/85 mt-1">View and manage your shortlisted candidates with contact information and interview materials.</p>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#172233]/70">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Enter a job code to load candidates</span>
        </div>
        <div className="flex items-center gap-2">
          <input className="rounded-lg border border-[hsl(var(--border))] bg-white/70 px-3 py-2 text-sm shadow-sm backdrop-blur transition-all duration-200 focus:border-[#2487FE] focus:ring-2 focus:ring-[#2487FE] focus:ring-offset-2 hover:border-[hsl(var(--border))]/80" placeholder="JPC - 123" value={jobCode} onChange={(e)=>setJobCode(e.target.value)} />
          <button className="rounded-lg bg-[#2487FE] px-4 py-2 text-white font-medium text-sm shadow-md hover:bg-[#1d6fd1] hover:shadow-lg transition-all duration-200 active:scale-95" onClick={fetchShortlist}>Load</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-[#172233]/70">
            <svg className="h-5 w-5 animate-spin text-[#2487FE]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading candidates...</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-6 shadow-xl backdrop-blur transition-all duration-200 hover:shadow-2xl hover:scale-[1.01] hover:border-[#2487FE]/20 supports-[backdrop-filter]:bg-[hsl(var(--card))]/70">
              <div className="flex items-start gap-4">
                {it.profilePic ? <img src={it.profilePic} alt="pic" className="h-16 w-16 rounded-full object-cover shadow-lg ring-2 ring-[#2487FE]/10" /> : <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#2487FE]/20 to-[#172233]/20 flex items-center justify-center text-[#172233] font-semibold text-lg">{(it.fullName || 'U').charAt(0)}</div>}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-[#172233]">{it.fullName || 'Unknown'}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2487FE]/10 text-[#2487FE] border border-[#2487FE]/20">({it.overallRating ?? '?'}/10)</span>
                  </div>
                  <div className="text-sm text-[#172233]/85 mb-3">{it.headline || 'No headline available'}</div>

                  {/* Contact Information */}
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-[#2487FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[#172233]/70">{it.email || 'Email not available'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-[#2487FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-[#172233]/70">{it.phone || 'Phone not available'}</span>
                    </div>
                  </div>
                  <div className="bg-[#F1F3F7] rounded-lg p-3 mb-4">
                    <div className="text-xs font-medium text-[#172233] mb-1">Justification</div>
                    <div className="text-sm text-[#172233]/85 whitespace-pre-line">{it.justification || 'No justification provided'}</div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="bg-white/50 rounded-lg p-3 border border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4 text-[#2487FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-[#172233]">Email draft</span>
                      </div>
                      <textarea className="w-full h-28 rounded-lg border border-[hsl(var(--border))] bg-white/70 p-3 text-sm shadow-sm backdrop-blur transition-all duration-200 focus:border-[#2487FE] focus:ring-2 focus:ring-[#2487FE] focus:ring-offset-2 hover:border-[hsl(var(--border))]/80 resize-none" defaultValue={it.emailBody || 'No email draft available'} />
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 border border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4 text-[#2487FE]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.479 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                        </svg>
                        <span className="text-sm font-medium text-[#172233]">WhatsApp draft</span>
                      </div>
                      <textarea className="w-full h-28 rounded-lg border border-[hsl(var(--border))] bg-white/70 p-3 text-sm shadow-sm backdrop-blur transition-all duration-200 focus:border-[#2487FE] focus:ring-2 focus:ring-[#2487FE] focus:ring-offset-2 hover:border-[hsl(var(--border))]/80 resize-none" defaultValue={buildWhatsAppDraft(it)} />
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3 border border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-[#2487FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-[#172233]">Interview questions</span>
                    </div>
                    {(it.questions || []).length > 0 ? (
                      <ul className="space-y-2">
                        {(it.questions || []).map((q: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-[#2487FE] bg-[#2487FE]/10 rounded-full mt-0.5 flex-shrink-0">{idx + 1}</span>
                            <span className="text-sm text-[#172233]/85">{q}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#172233]/60 italic">No interview questions available</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 min-w-[140px]">
                  <button className="rounded-lg bg-[#2487FE] px-4 py-2.5 text-white font-medium text-sm shadow-md hover:bg-[#1d6fd1] hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.479 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.479 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                    </svg>
                    Send WhatsApp
                  </button>
                  <button className="rounded-lg border border-[#172233] bg-transparent px-4 py-2.5 text-[#172233] font-medium text-sm shadow-sm hover:bg-[#2487FE]/5 hover:border-[#2487FE] hover:text-[#2487FE] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
                  </button>
                  <button className="rounded-lg border border-[#172233] bg-transparent px-4 py-2.5 text-[#172233] font-medium text-sm shadow-sm hover:bg-[#2487FE]/5 hover:border-[#2487FE] hover:text-[#2487FE] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-lg border border-[#172233] bg-transparent px-4 py-2 text-[#172233] font-medium text-sm shadow-sm hover:bg-[#2487FE]/5 hover:border-[#2487FE] hover:text-[#2487FE] transition-all duration-200 active:scale-95" onClick={()=> setPage(Math.max(1, page-1))}>Previous</button>
        <button className="rounded-lg border border-[#172233] bg-transparent px-4 py-2 text-[#172233] font-medium text-sm shadow-sm hover:bg-[#2487FE]/5 hover:border-[#2487FE] hover:text-[#2487FE] transition-all duration-200 active:scale-95" onClick={()=> setPage(page+1)}>Next</button>
      </div>
    </div>
  )
}
