import { NextRequest, NextResponse } from 'next/server'
import { ProcessingTracker } from '@/lib/processing/tracker'
import { prisma } from '@/lib/db/prisma'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const processingJobId = searchParams.get('processingJobId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!jobId && !processingJobId) {
      return bad('job_id_or_processing_job_id_required', 400)
    }

    if (processingJobId) {
      // Get specific processing job details
      const processingJob = await prisma.processingJob.findUnique({
        where: { id: processingJobId },
        include: {
          logs: {
            orderBy: { timestamp: 'desc' },
            take: 50
          }
        }
      })

      if (!processingJob) {
        return bad('processing_job_not_found', 404)
      }

      // Calculate progress percentage
      const progressPercentage = processingJob.totalSubmissions > 0
        ? Math.round(((processingJob.processedCount + processingJob.errorCount) / processingJob.totalSubmissions) * 100)
        : 0

      // Determine current phase based on status and progress
      let currentPhase = 'initializing'
      let phaseDescription = 'Preparing to process applicants...'

      if (processingJob.status === 'running') {
        if (progressPercentage === 0) {
          currentPhase = 'downloading'
          phaseDescription = 'Downloading resumes from Ceipal...'
        } else if (progressPercentage < 50) {
          currentPhase = 'parsing'
          phaseDescription = 'Parsing resumes and extracting data...'
        } else if (progressPercentage < 90) {
          currentPhase = 'processing'
          phaseDescription = 'Processing candidate profiles...'
        } else {
          currentPhase = 'finalizing'
          phaseDescription = 'Finalizing processing and cleanup...'
        }
      } else if (processingJob.status === 'completed') {
        currentPhase = 'completed'
        phaseDescription = 'Processing completed successfully!'
      } else if (processingJob.status === 'failed') {
        currentPhase = 'failed'
        phaseDescription = 'Processing failed. Please check the logs.'
      }

      // Estimate completion time based on current progress
      let estimatedCompletionTime: string | null = null
      if (processingJob.status === 'running' && processingJob.processedCount > 0) {
        const elapsedMs = Date.now() - processingJob.startedAt.getTime()
        const itemsPerMs = processingJob.processedCount / elapsedMs
        const remainingItems = processingJob.totalSubmissions - processingJob.processedCount - processingJob.errorCount
        const estimatedRemainingMs = remainingItems / itemsPerMs

        if (estimatedRemainingMs > 0 && estimatedRemainingMs < 24 * 60 * 60 * 1000) { // Less than 24 hours
          const minutes = Math.ceil(estimatedRemainingMs / (1000 * 60))
          if (minutes < 60) {
            estimatedCompletionTime = `${minutes} minute${minutes !== 1 ? 's' : ''}`
          } else {
            const hours = Math.ceil(minutes / 60)
            estimatedCompletionTime = `${hours} hour${hours !== 1 ? 's' : ''}`
          }
        }
      }

      return NextResponse.json({
        success: true,
        processingJob: {
          ...processingJob,
          duration: processingJob.durationMs ? `${(processingJob.durationMs / 1000).toFixed(1)}s` : null,
          successRate: processingJob.totalSubmissions > 0
            ? ((processingJob.processedCount / processingJob.totalSubmissions) * 100).toFixed(1) + '%'
            : '0%',
          progressPercentage,
          currentPhase,
          phaseDescription,
          estimatedCompletionTime,
          userMessage: generateUserMessage(processingJob.status, progressPercentage, processingJob.processedCount, processingJob.errorCount, estimatedCompletionTime)
        }
      })
    } else if (jobId) {
      // Get job statistics and processing history
      const [statistics, processingJobs, failedApplicants] = await Promise.all([
        ProcessingTracker.getJobStatistics(jobId),
        prisma.processingJob.findMany({
          where: { jobId },
          orderBy: { startedAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            _count: {
              select: { logs: true }
            }
          }
        }),
        ProcessingTracker.getFailedApplicants(jobId)
      ])

      // Get job details
      const job = await prisma.job.findFirst({
        where: {
          OR: [
            { id: jobId },
            { ceipalId: jobId }
          ]
        },
        select: { id: true, jobCode: true, title: true, ceipalId: true }
      })

      return NextResponse.json({
        success: true,
        job,
        statistics,
        processingJobs: processingJobs.map(pj => ({
          ...pj,
          duration: pj.durationMs ? `${(pj.durationMs / 1000).toFixed(1)}s` : null,
          successRate: pj.totalSubmissions > 0
            ? ((pj.processedCount / pj.totalSubmissions) * 100).toFixed(1) + '%'
            : '0%',
          logCount: pj._count.logs
        })),
        failedApplicants: failedApplicants.slice(0, 20), // Last 20 failed applicants
        retryAvailable: failedApplicants.length > 0
      })
    }

  } catch (error) {
    console.error('[processing-status] Failed:', error)
    return bad('processing_status_failed', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobId, action } = body

    if (!jobId || !action) {
      return bad('job_id_and_action_required', 400)
    }

    if (action === 'retry_failed') {
      // Trigger retry of failed applicants
      const failedApplicants = await ProcessingTracker.getFailedApplicants(jobId)

      if (failedApplicants.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No failed applicants found to retry',
          retryCount: 0
        })
      }

      // Return instructions for retry
      return NextResponse.json({
        success: true,
        message: `Found ${failedApplicants.length} failed applicants ready for retry`,
        retryCount: failedApplicants.length,
        failedApplicants: failedApplicants.slice(0, 10), // Show first 10
        instructions: {
          endpoint: '/api/ceipal/fetch-applicants',
          method: 'POST',
          body: {
            jobId,
            parsingMode: 'llamaparse', // or appropriate mode
            retryFailedOnly: true
          }
        }
      })
    } else if (action === 'clear_failed') {
      // Clear failed applicant records (for testing/cleanup)
      const count = await prisma.processingLog.deleteMany({
        where: {
          level: 'error',
          processingJob: {
            jobId
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Cleared ${count.count} failed applicant records`,
        clearedCount: count.count
      })
    } else {
      return bad('invalid_action', 400)
    }

  } catch (error) {
    console.error('[processing-status] POST failed:', error)
    return bad('processing_status_action_failed', 500)
  }
}

function generateUserMessage(
  status: string,
  progressPercentage: number,
  processedCount: number,
  errorCount: number,
  estimatedTime: string | null
): string {
  if (status === 'completed') {
    return `✅ Processing completed! Successfully processed ${processedCount} applicants${errorCount > 0 ? ` with ${errorCount} errors` : ''}.`
  }

  if (status === 'failed') {
    return `❌ Processing failed. Please check the logs for details and try again.`
  }

  if (status === 'running') {
    const baseMessage = `🔄 Processing in progress... ${processedCount} applicants completed (${progressPercentage}%)`

    if (estimatedTime) {
      return `${baseMessage}. Estimated time remaining: ${estimatedTime}. You can safely navigate away and return to this page to check progress.`
    }

    return `${baseMessage}. Processing is ongoing - you can navigate away and return to this page to check progress.`
  }

  return 'Processing status unknown.'
}