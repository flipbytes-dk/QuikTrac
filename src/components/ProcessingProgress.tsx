'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, XCircle, Clock, Users, FileText, Bot, AlertTriangle, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/auth/api-client'

interface ProcessingJob {
  id: string
  status: 'running' | 'completed' | 'failed'
  jobCode?: string
  parsingMode: string

  // Progress info
  currentPhase?: string
  phaseDescription?: string
  progressPercentage: number
  estimatedCompletionTime?: string | null

  // Counters
  totalSubmissions: number
  processedCount: number
  errorCount: number
  s3UploadCount: number
  parsedCount: number
  embeddingCount: number

  // Status counts
  successfulApplicants?: number
  failedApplicants?: number

  // Costs
  totalCost: number
  parsingCost: number
  openaiCost: number
  embeddingCost: number

  // Timing
  startedAt: string
  completedAt?: string
  durationMs?: number

  // User messaging
  userMessage?: string

  // Recent logs
  logs?: Array<{
    level: string
    message: string
    applicantName?: string
    timestamp: string
    details?: any
  }>
}

interface ProcessingProgressProps {
  processingJobId: string
  onComplete?: (job: ProcessingJob) => void
  onError?: (error: string) => void
}

export function ProcessingProgress({ processingJobId, onComplete, onError }: ProcessingProgressProps) {
  const [job, setJob] = useState<ProcessingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient.getJson(`/api/ceipal/processing-status?processingJobId=${processingJobId}`)

      if (data.success && data.processingJob) {
        setJob(data.processingJob)
        setError(null)
        setLastUpdated(new Date())

        // Call completion callback if job is done
        if (data.processingJob.status === 'completed' && onComplete) {
          onComplete(data.processingJob)
        }

        // Call error callback if job failed
        if (data.processingJob.status === 'failed' && onError) {
          onError(data.processingJob.userMessage || 'Processing failed')
        }
      } else {
        setError('Failed to fetch processing status')
      }
    } catch (err) {
      console.error('Failed to fetch processing status:', err)
      setError('Failed to fetch processing status')
      if (onError) {
        onError('Failed to fetch processing status')
      }
    } finally {
      setLoading(false)
    }
  }, [processingJobId, onComplete, onError])

  useEffect(() => {
    fetchStatus()

    // Set up polling for running jobs
    const pollInterval = setInterval(() => {
      if (job?.status === 'running') {
        fetchStatus()
      }
    }, 3000) // Poll every 3 seconds for running jobs

    return () => clearInterval(pollInterval)
  }, [fetchStatus, job?.status])

  if (loading && !job) {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-[#2487FE]" />
            <span className="text-[#172233]">Loading processing status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white shadow-sm border-0 border-l-4 border-l-red-500">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <XCircle className="h-6 w-6 text-red-500 mr-3" />
            <div className="flex-1">
              <p className="text-red-600 font-medium">Error loading processing status</p>
              <p className="text-red-500 text-sm">{error}</p>
            </div>
            <Button
              onClick={fetchStatus}
              variant="outline"
              size="sm"
              className="ml-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!job) {
    return null
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'running':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatCost = (cost: number) => cost > 0 ? `$${cost.toFixed(4)}` : '$0.00'

  const formatDuration = () => {
    if (job.status === 'running') {
      const elapsed = Date.now() - new Date(job.startedAt).getTime()
      const minutes = Math.floor(elapsed / (1000 * 60))
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    } else if (job.durationMs) {
      const minutes = Math.floor(job.durationMs / (1000 * 60))
      const seconds = Math.floor((job.durationMs % (1000 * 60)) / 1000)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return 'Unknown'
  }

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-[#172233] flex items-center">
          {getStatusIcon()}
          <span className="ml-3">Processing Status</span>
          <Badge className={`ml-3 ${getStatusColor()}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Message */}
        {job.userMessage && (
          <div className={`p-4 rounded-lg border-l-4 ${
            job.status === 'completed' ? 'bg-green-50 border-l-green-500' :
            job.status === 'failed' ? 'bg-red-50 border-l-red-500' :
            'bg-blue-50 border-l-blue-500'
          }`}>
            <p className={`text-sm ${
              job.status === 'completed' ? 'text-green-700' :
              job.status === 'failed' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {job.userMessage}
            </p>
          </div>
        )}

        {/* Multi-user processing notice */}
        {job.status === 'running' && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-amber-600" />
              <p className="text-sm text-amber-700">
                <span className="font-medium">Multi-user processing:</span> If another user started this job, you're viewing their progress.
                The processing will continue even if you close this page.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar and Phase */}
        {job.status === 'running' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#172233]">{job.phaseDescription || 'Processing...'}</span>
              <span className="text-sm text-[#172233]/70">{job.progressPercentage}%</span>
            </div>
            <Progress value={job.progressPercentage} className="w-full" />
            {job.estimatedCompletionTime && (
              <div className="flex items-center text-sm text-[#172233]/70">
                <Clock className="h-4 w-4 mr-1" />
                Estimated time remaining: {job.estimatedCompletionTime}
              </div>
            )}
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F1F3F7] p-3 rounded-lg">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-[#172233]/50" />
              <span className="text-sm text-[#172233]/70">Total</span>
            </div>
            <div className="text-lg font-semibold text-[#172233]">{job.totalSubmissions}</div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              <span className="text-sm text-green-700">Processed</span>
            </div>
            <div className="text-lg font-semibold text-green-700">{job.processedCount}</div>
          </div>

          {job.errorCount > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-sm text-red-700">Errors</span>
              </div>
              <div className="text-lg font-semibold text-red-700">{job.errorCount}</div>
            </div>
          )}

          {job.parsingMode !== 'none' && job.parsedCount > 0 && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center">
                <Bot className="h-4 w-4 mr-2 text-purple-600" />
                <span className="text-sm text-purple-700">Parsed</span>
              </div>
              <div className="text-lg font-semibold text-purple-700">{job.parsedCount}</div>
            </div>
          )}

          {job.s3UploadCount > 0 && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-orange-600" />
                <span className="text-sm text-orange-700">Uploaded</span>
              </div>
              <div className="text-lg font-semibold text-orange-700">{job.s3UploadCount}</div>
            </div>
          )}
        </div>

        {/* Processing Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#172233]/70">
          <div>
            <span className="font-medium">Job Code:</span> {job.jobCode || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Parsing Mode:</span> {job.parsingMode}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {formatDuration()}
          </div>
          <div>
            <span className="font-medium">Total Cost:</span> {formatCost(job.totalCost)}
          </div>
          {lastUpdated && (
            <div className="md:col-span-2">
              <span className="font-medium">Last Updated:</span> {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Recent Logs (if available) */}
        {job.logs && job.logs.length > 0 && (
          <div>
            <h4 className="font-medium text-[#172233] mb-3">Recent Activity</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {job.logs.slice(0, 10).map((log, index) => (
                <div key={index} className={`p-2 rounded text-sm ${
                  log.level === 'error' ? 'bg-red-50 text-red-700' :
                  log.level === 'success' ? 'bg-green-50 text-green-700' :
                  log.level === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="flex-1">{log.message}</span>
                    <span className="text-xs opacity-70 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.applicantName && (
                    <div className="text-xs opacity-70 mt-1">
                      Applicant: {log.applicantName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}