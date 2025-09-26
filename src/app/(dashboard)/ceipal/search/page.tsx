'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Search, Calendar, MapPin, Briefcase, DollarSign, Users, FileText, Bot, Zap } from 'lucide-react'
import { apiClient } from '@/lib/auth/api-client'
import { ProcessingProgress } from '@/components/ProcessingProgress'

interface JobPosting {
  id?: string | number
  job_code?: string
  position_title?: string
  status_name?: string
  location?: string
  city?: string
  state?: string
  country?: string
  employment_type?: string
  currency?: string
  skills?: string
  requisition_description?: string
  job_start_date?: string
  closing_date?: string
  apply_job?: string
  pay_rates?: any[]
  company?: number
  raw?: any
}

export default function CeipalSearchPage() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<JobPosting[]>([])
  const [jobCodes, setJobCodes] = useState<string[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [fetchingApplicants, setFetchingApplicants] = useState(false)
  const [parsingMode, setParsingMode] = useState<'none' | 'llamaparse' | 'landingai'>('none')
  const [rankingCandidates, setRankingCandidates] = useState(false)
  const [shortlistedCandidates, setShortlistedCandidates] = useState<any[]>([])
  const [showShortlist, setShowShortlist] = useState(false)
  const [processingJobId, setProcessingJobId] = useState<string | null>(null)

  const [jobCodeFilter, setJobCodeFilter] = useState('')
  const [jobCodeSearch, setJobCodeSearch] = useState('')
  const [minStartDate, setMinStartDate] = useState('2025-04-01')

  // Filter job codes based on search and date filter
  const filteredJobCodes = jobCodes.filter(code =>
    code.toLowerCase().includes(jobCodeSearch.toLowerCase())
  )

  async function loadJobs() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (jobCodeFilter) params.set('job_code', jobCodeFilter)
      if (minStartDate) params.set('min_start_date', minStartDate)

      const data = await apiClient.getJson(`/api/ceipal/job-postings?${params.toString()}`)
      setItems(data.items || [])
      setJobCodes(data.jobCodes || [])
    } catch (e) {
      setError('Failed to load job postings')
    } finally {
      setLoading(false)
    }
  }

  async function refreshJobPostings() {
    setRefreshing(true)
    try {
      await apiClient.post('/api/ceipal/job-postings/sync')
      await loadJobs()
    } catch (_) {
      setError('Failed to refresh job postings')
    } finally {
      setRefreshing(false)
    }
  }

  function selectJobCode(code: string) {
    setJobCodeFilter(code)
    setJobCodeSearch('')
  }

  async function fetchJobDetails(job: JobPosting) {
    setSelectedJob(job)

    // Check for existing processing job in localStorage first
    if (job.id) {
      const storedProcessingJobId = localStorage.getItem(`processing_${job.id}`)
      if (storedProcessingJobId) {
        setProcessingJobId(storedProcessingJobId)
        return
      }

      // Check for any running processing job for this job on the server
      try {
        const data = await apiClient.getJson(`/api/ceipal/processing-status?jobId=${job.id}`)
        if (data.success && data.currentRunningJob) {
          setProcessingJobId(data.currentRunningJob)
          localStorage.setItem(`processing_${job.id}`, data.currentRunningJob)
        }
      } catch (error) {
        // If we can't check server status, that's okay - continue normally
        console.warn('Could not check processing status:', error)
      }
    }
  }

  async function fetchApplicants() {
    if (!selectedJob?.id) return

    setFetchingApplicants(true)
    setError(null)
    try {
      const data = await apiClient.postJson('/api/ceipal/fetch-applicants', {
        jobId: selectedJob.id,
        parsingMode: parsingMode
      })
      console.log('Fetch applicants result:', data)

      // Store processing job ID for tracking
      if (data.processingJobId) {
        console.log('Setting processingJobId:', data.processingJobId)
        setProcessingJobId(data.processingJobId)
        // Store in localStorage for persistence
        localStorage.setItem(`processing_${selectedJob.id}`, data.processingJobId)
      }

      // Don't set fetchingApplicants to false immediately - let the ProcessingProgress component handle this
      // The ProcessingProgress component will call handleProcessingComplete when done

    } catch (error: any) {
      console.error('Failed to fetch applicants:', error)

      // Handle concurrent processing scenario
      if (error?.status === 409 && error?.data?.error === 'processing_already_in_progress') {
        const existingJobId = error.data.existingProcessingJobId
        if (existingJobId) {
          // Track the existing processing job instead
          setProcessingJobId(existingJobId)
          localStorage.setItem(`processing_${selectedJob.id}`, existingJobId)

          // Show user-friendly message
          setError(`Another user is already processing this job. You can monitor the progress below.`)
        } else {
          setError(error.data.message || 'Another user is processing this job. Please wait and try again later.')
          setFetchingApplicants(false)
        }
      } else {
        setError('Failed to fetch applicants. Please try again.')
        setFetchingApplicants(false)
        setProcessingJobId(null)
      }
    }
    // Don't set fetchingApplicants to false in finally - let ProcessingProgress handle it
  }

  async function rankCandidates() {
    if (!selectedJob?.job_code) return

    setRankingCandidates(true)
    setError(null)
    try {
      const data = await apiClient.postJson('/api/ceipal/rank', {
        jobCode: selectedJob.job_code,
        jd: selectedJob.requisition_description,
        concurrency: 3
      })
      console.log('Ranking result:', data)

      alert(`✅ Successfully ranked ${data.ranked} candidates`)

      // Load shortlisted candidates
      await loadShortlistedCandidates()

    } catch (error) {
      console.error('Failed to rank candidates:', error)
      setError('Failed to rank candidates. Please try again.')
    } finally {
      setRankingCandidates(false)
    }
  }

  async function loadShortlistedCandidates() {
    if (!selectedJob?.job_code) return

    try {
      const data = await apiClient.getJson(`/api/ceipal/shortlist?jobCode=${selectedJob.job_code}&pageSize=20`)
      setShortlistedCandidates(data.items || [])
      setShowShortlist(true)
    } catch (error) {
      console.error('Failed to load shortlisted candidates:', error)
      setError('Failed to load shortlisted candidates.')
    }
  }

  // Format pay rates for display
  function formatPayRates(payRates: any[]): string {
    if (!payRates || payRates.length === 0) return 'Not specified'
    const rate = payRates[0]
    if (rate.pay_rate === 'N/A' || !rate.pay_rate) return 'Not specified'
    return `${rate.pay_rate} ${rate.pay_rate_currency || ''} ${rate.pay_rate_pay_frequency_type || ''}`.trim()
  }

  function handleProcessingComplete(job: any) {
    setFetchingApplicants(false)
    setProcessingJobId(null)

    // Clear from localStorage
    if (selectedJob?.id) {
      localStorage.removeItem(`processing_${selectedJob.id}`)
    }

    // Auto-start ranking if we have processed applicants
    if (job.processedCount > 0) {
      rankCandidates()
    }
  }

  function handleProcessingError(error: string) {
    setFetchingApplicants(false)
    setError(error)

    // Clear from localStorage
    if (selectedJob?.id) {
      localStorage.removeItem(`processing_${selectedJob.id}`)
    }
  }

  useEffect(() => {
    loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#F1F3F7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h1 className="text-3xl font-semibold text-[#172233] mb-2">Ceipal Job Postings</h1>
          <p className="text-[#172233]/70">Search and filter job postings with start dates after the date you specify below</p>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-[#172233]">Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Minimum Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#172233]">Minimum Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#172233]/50" />
                  <Input
                    type="date"
                    value={minStartDate}
                    onChange={(e) => setMinStartDate(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-[#2487FE] focus:ring-[#2487FE]"
                  />
                </div>
              </div>

              {/* Job Code Search */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-[#172233]">Job Code</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#172233]/50" />
                  <Input
                    value={jobCodeSearch}
                    onChange={(e) => setJobCodeSearch(e.target.value)}
                    placeholder="Search job codes..."
                    className="pl-10 border-gray-200 focus:border-[#2487FE] focus:ring-[#2487FE]"
                  />
                </div>
                {jobCodeSearch && filteredJobCodes.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white border border-gray-200 shadow-lg">
                    {filteredJobCodes.slice(0, 8).map((code) => (
                      <button
                        key={code}
                        onClick={() => selectJobCode(code)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-[#2487FE]/5 focus:bg-[#2487FE]/10 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={loadJobs}
                  disabled={loading}
                  className="bg-[#2487FE] hover:bg-[#2487FE]/90 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Jobs
                    </>
                  )}
                </Button>
                <Button
                  onClick={refreshJobPostings}
                  disabled={refreshing}
                  variant="outline"
                  className="border-[#172233] text-[#172233] hover:bg-[#2487FE]/5"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Selected Filters Display */}
            {(jobCodeFilter || minStartDate !== '2025-04-01') && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <span className="text-sm text-[#172233]/70">Active filters:</span>
                {jobCodeFilter && (
                  <Badge variant="secondary" className="bg-[#2487FE]/10 text-[#2487FE] border-[#2487FE]/20">
                    Job Code: {jobCodeFilter}
                    <button
                      onClick={() => {
                        setJobCodeFilter('')
                        setJobCodeSearch('')
                      }}
                      className="ml-1 hover:bg-[#2487FE]/20 rounded"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {minStartDate !== '2025-04-01' && (
                  <Badge variant="secondary" className="bg-[#2487FE]/10 text-[#2487FE] border-[#2487FE]/20">
                    Start Date: {minStartDate}
                    <button
                      onClick={() => setMinStartDate('2025-04-01')}
                      className="ml-1 hover:bg-[#2487FE]/20 rounded"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Job List */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm border-0 h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-[#172233]">
                  Job Postings ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 overflow-y-auto flex-1">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-[#172233]/50">
                    No job postings found matching your criteria
                  </div>
                ) : (
                  items.map((job) => (
                    <div
                      key={String(job.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedJob?.id === job.id
                          ? 'border-[#2487FE] bg-[#2487FE]/5'
                          : 'border-gray-100 hover:border-[#2487FE]/30 hover:bg-gray-50'
                      }`}
                      onClick={() => fetchJobDetails(job)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-[#172233] text-sm">{job.job_code}</h3>
                        <Badge
                          variant={job.status_name === 'Active' ? 'default' : 'secondary'}
                          className={job.status_name === 'Active' ? 'bg-green-100 text-green-700' : ''}
                        >
                          {job.status_name}
                        </Badge>
                      </div>
                      <p className="text-[#172233] font-medium mb-1">{job.position_title}</p>
                      <div className="flex items-center text-sm text-[#172233]/70">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.location || 'Location not specified'}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Job Detail Card */}
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-sm border-0 h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-[#172233]">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1">
              {!selectedJob ? (
                <div className="text-center py-12 text-[#172233]/50">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-[#172233]/30" />
                  <p>Select a job posting to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-semibold text-[#172233]">
                        {selectedJob.position_title}
                      </h2>
                      <Badge
                        variant={selectedJob.status_name === 'Active' ? 'default' : 'secondary'}
                        className={selectedJob.status_name === 'Active' ? 'bg-green-100 text-green-700' : ''}
                      >
                        {selectedJob.status_name}
                      </Badge>
                    </div>
                    <p className="text-[#2487FE] font-medium">{selectedJob.job_code}</p>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[#F1F3F7] rounded-lg">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-[#172233]/50" />
                      <span className="text-sm text-[#172233]">
                        {selectedJob.location || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-2 text-[#172233]/50" />
                      <span className="text-sm text-[#172233]">
                        {selectedJob.employment_type || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-[#172233]/50" />
                      <span className="text-sm text-[#172233]">
                        Starts: {selectedJob.job_start_date || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-[#172233]/50" />
                      <span className="text-sm text-[#172233]">
                        {formatPayRates(selectedJob.pay_rates || [])}
                      </span>
                    </div>
                  </div>

                  {/* Skills */}
                  {selectedJob.skills && (
                    <div>
                      <h3 className="font-medium text-[#172233] mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.skills.split(',').map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  {selectedJob.requisition_description && (
                    <div>
                      <h3 className="font-medium text-[#172233] mb-3">Job Description</h3>
                      <div
                        className="prose prose-sm max-w-none text-[#172233]/80"
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedJob.requisition_description
                        }}
                      />
                    </div>
                  )}

                  {/* Resume Parsing Options */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="font-medium text-[#172233] mb-3 flex items-center">
                      <Bot className="h-4 w-4 mr-2" />
                      Resume Parsing Options
                    </h3>

                    <div className="space-y-3 mb-4">
                      {/* No Parsing */}
                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          parsingMode === 'none'
                            ? 'border-[#2487FE] bg-[#2487FE]/5'
                            : 'border-gray-200 hover:border-[#2487FE]/30'
                        }`}
                        onClick={() => setParsingMode('none')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-3 text-[#172233]/60" />
                            <div>
                              <p className="font-medium text-[#172233]">Basic Processing</p>
                              <p className="text-sm text-[#172233]/70">Extract name, email, phone only</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            $0.00
                          </Badge>
                        </div>
                        <p className="text-xs text-[#172233]/60 mt-2 ml-7">
                          Fast and free for volume hires where you only need contact details
                        </p>
                      </div>

                      {/* LlamaParse */}
                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          parsingMode === 'llamaparse'
                            ? 'border-[#2487FE] bg-[#2487FE]/5'
                            : 'border-gray-200 hover:border-[#2487FE]/30'
                        }`}
                        onClick={() => setParsingMode('llamaparse')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Bot className="h-4 w-4 mr-3 text-purple-600" />
                            <div>
                              <p className="font-medium text-[#172233]">LlamaParse</p>
                              <p className="text-sm text-[#172233]/70">Advanced parsing with markdown output</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            $0.003/page
                          </Badge>
                        </div>
                        <p className="text-xs text-[#172233]/60 mt-2 ml-7">
                          Best for complex documents, handles tables and formatting well
                        </p>
                      </div>

                      {/* Landing AI */}
                      {/* <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          parsingMode === 'landingai'
                            ? 'border-[#2487FE] bg-[#2487FE]/5'
                            : 'border-gray-200 hover:border-[#2487FE]/30'
                        }`}
                        onClick={() => setParsingMode('landingai')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Zap className="h-4 w-4 mr-3 text-orange-600" />
                            <div>
                              <p className="font-medium text-[#172233]">Landing AI</p>
                              <p className="text-sm text-[#172233]/70">Fast AI-powered document parsing</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            ~$0.025/page
                          </Badge>
                        </div>
                        <p className="text-xs text-[#172233]/60 mt-2 ml-7">
                          Quick processing with structured output and metadata
                        </p>
                      </div> */}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        onClick={fetchApplicants}
                        disabled={fetchingApplicants || rankingCandidates || !!processingJobId}
                        className="bg-[#2487FE] hover:bg-[#2487FE]/90 text-white font-medium w-full"
                      >
                        {fetchingApplicants ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Fetching Applicants...
                          </>
                        ) : processingJobId ? (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Processing in Progress...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Fetch & Rank Applicants ({parsingMode === 'none' ? 'Basic' :
                              parsingMode === 'llamaparse' ? 'LlamaParse' : 'Landing AI'})
                          </>
                        )}
                      </Button>

                      {rankingCandidates && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <Bot className="h-4 w-4 mr-2 text-yellow-600 animate-pulse" />
                            <span className="text-sm text-yellow-700 font-medium">Ranking candidates with AI...</span>
                          </div>
                        </div>
                      )}

                      {shortlistedCandidates.length > 0 && (
                        <Button
                          onClick={() => setShowShortlist(!showShortlist)}
                          variant="outline"
                          className="w-full border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {showShortlist ? 'Hide' : 'Show'} Shortlisted Candidates ({shortlistedCandidates.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Shortlisted Candidates Section */}
        {showShortlist && shortlistedCandidates.length > 0 && (
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#172233] flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Top Ranked Candidates ({shortlistedCandidates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {shortlistedCandidates.map((candidate, index) => (
                  <div key={candidate.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <h3 className="font-semibold text-[#172233]">{candidate.name}</h3>
                          <Badge className="bg-green-100 text-green-700">
                            Score: {candidate.score}/100
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[#172233]/70 mb-2">
                          {candidate.email && (
                            <div>📧 {candidate.email}</div>
                          )}
                          {candidate.phone && (
                            <div>📞 {candidate.phone}</div>
                          )}
                          {candidate.location && (
                            <div>📍 {candidate.location}</div>
                          )}
                        </div>
                        {candidate.currentTitle && (
                          <div className="text-sm text-[#172233] font-medium mb-1">
                            {candidate.currentTitle}
                            {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                          </div>
                        )}
                        {candidate.yearsExperience && (
                          <div className="text-sm text-[#172233]/70">
                            {candidate.yearsExperience} years experience
                          </div>
                        )}
                      </div>
                    </div>

                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 6).map((skill: string, skillIndex: number) => (
                            <Badge key={skillIndex} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {candidate.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">AI Assessment</h4>
                        <p className="text-sm text-blue-800">{candidate.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Progress */}
        {processingJobId && (
          <div className="mt-6">
            <ProcessingProgress
              processingJobId={processingJobId}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
            />
          </div>
        )}

        {/* Debug: Show processingJobId state */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 text-xs">
            Debug - processingJobId: {processingJobId || 'null'}
          </div>
        )}
      </div>
    </div>
  )
}