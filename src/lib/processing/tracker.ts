/**
 * Processing Job Tracker
 * Comprehensive tracking and logging for applicant processing operations
 */

import { prisma } from '@/lib/db/prisma'

export interface ProcessingJobInfo {
  id: string
  jobId: string
  jobCode?: string
  parsingMode: string
  status: 'running' | 'completed' | 'failed'

  // Counters
  totalSubmissions: number
  processedCount: number
  errorCount: number
  s3UploadCount: number
  parsedCount: number
  embeddingCount: number

  // Costs
  totalCost: number
  parsingCost: number
  openaiCost: number
  embeddingCost: number

  // Timing
  startedAt: Date
  completedAt?: Date
  durationMs?: number

  // Results
  errors: string[]
  successfulApplicants: string[]
  failedApplicants: string[]
}

export interface ProcessingLogEntry {
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  applicantId?: string
  applicantName?: string
  details?: Record<string, any>
}

export class ProcessingTracker {
  private processingJobId: string
  private jobId: string
  private startTime: number

  constructor(processingJobId: string, jobId: string) {
    this.processingJobId = processingJobId
    this.jobId = jobId
    this.startTime = Date.now()
  }

  /**
   * Create a new processing job
   */
  static async createJob(
    jobId: string,
    jobCode: string | undefined,
    parsingMode: string,
    totalSubmissions: number
  ): Promise<ProcessingTracker> {
    const processingJob = await prisma.processingJob.create({
      data: {
        jobId,
        jobCode,
        parsingMode,
        status: 'running',
        totalSubmissions
      }
    })

    const tracker = new ProcessingTracker(processingJob.id, jobId)

    await tracker.log({
      level: 'info',
      message: `Started processing ${totalSubmissions} submissions for job ${jobCode || jobId} in ${parsingMode} mode`
    })

    return tracker
  }

  /**
   * Log an event
   */
  async log(entry: ProcessingLogEntry): Promise<void> {
    try {
      await prisma.processingLog.create({
        data: {
          processingJobId: this.processingJobId,
          level: entry.level,
          message: entry.message,
          applicantId: entry.applicantId,
          applicantName: entry.applicantName,
          details: entry.details || undefined
        }
      })
    } catch (error) {
      // Don't fail the main process if logging fails
      console.error('[ProcessingTracker] Logging failed:', error)
    }
  }

  /**
   * Update job counters
   */
  async updateCounters(updates: Partial<{
    processedCount: number
    errorCount: number
    s3UploadCount: number
    parsedCount: number
    embeddingCount: number
    totalCost: number
    parsingCost: number
    openaiCost: number
    embeddingCost: number
    errors: string[]
    successfulApplicants: string[]
    failedApplicants: string[]
  }>): Promise<void> {
    try {
      const updateData: any = {}

      // Handle arrays by appending to existing values
      if (updates.errors) {
        const existing = await prisma.processingJob.findUnique({
          where: { id: this.processingJobId },
          select: { errors: true }
        })
        updateData.errors = [...(existing?.errors || []), ...updates.errors]
      }

      if (updates.successfulApplicants) {
        const existing = await prisma.processingJob.findUnique({
          where: { id: this.processingJobId },
          select: { successfulApplicants: true }
        })
        updateData.successfulApplicants = [...(existing?.successfulApplicants || []), ...updates.successfulApplicants]
      }

      if (updates.failedApplicants) {
        const existing = await prisma.processingJob.findUnique({
          where: { id: this.processingJobId },
          select: { failedApplicants: true }
        })
        updateData.failedApplicants = [...(existing?.failedApplicants || []), ...updates.failedApplicants]
      }

      // Handle numeric increments
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'number' && !['errors', 'successfulApplicants', 'failedApplicants'].includes(key)) {
          updateData[key] = { increment: value }
        }
      })

      await prisma.processingJob.update({
        where: { id: this.processingJobId },
        data: updateData
      })
    } catch (error) {
      console.error('[ProcessingTracker] Counter update failed:', error)
    }
  }

  /**
   * Mark job as completed
   */
  async complete(): Promise<ProcessingJobInfo> {
    const durationMs = Date.now() - this.startTime

    const job = await prisma.processingJob.update({
      where: { id: this.processingJobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs
      }
    })

    await this.log({
      level: 'success',
      message: `Processing completed in ${(durationMs / 1000).toFixed(1)}s. Processed: ${job.processedCount}/${job.totalSubmissions}, Errors: ${job.errorCount}, Cost: $${job.totalCost.toFixed(4)}`
    })

    return job as ProcessingJobInfo
  }

  /**
   * Mark job as failed
   */
  async fail(reason: string): Promise<ProcessingJobInfo> {
    const durationMs = Date.now() - this.startTime

    const job = await prisma.processingJob.update({
      where: { id: this.processingJobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs
      }
    })

    await this.log({
      level: 'error',
      message: `Processing failed after ${(durationMs / 1000).toFixed(1)}s: ${reason}`
    })

    return job as ProcessingJobInfo
  }

  /**
   * Get current job info
   */
  async getJobInfo(): Promise<ProcessingJobInfo> {
    const job = await prisma.processingJob.findUnique({
      where: { id: this.processingJobId }
    })
    if (!job) throw new Error('Processing job not found')
    return job as ProcessingJobInfo
  }

  /**
   * Get processing logs
   */
  async getLogs(limit = 100): Promise<Array<ProcessingLogEntry & { timestamp: Date }>> {
    const logs = await prisma.processingLog.findMany({
      where: { processingJobId: this.processingJobId },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    return logs.map(log => ({
      level: log.level as any,
      message: log.message,
      applicantId: log.applicantId || undefined,
      applicantName: log.applicantName || undefined,
      details: log.details as any,
      timestamp: log.timestamp
    }))
  }

  /**
   * Get failed applicants that can be retried
   */
  static async getFailedApplicants(jobId: string): Promise<Array<{
    processingJobId: string
    applicantName: string
    error: string
    timestamp: Date
  }>> {
    const jobs = await prisma.processingJob.findMany({
      where: { jobId },
      include: {
        logs: {
          where: { level: 'error', applicantName: { not: null } },
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    return jobs.flatMap(job =>
      job.logs.map(log => ({
        processingJobId: job.id,
        applicantName: log.applicantName!,
        error: log.message,
        timestamp: log.timestamp
      }))
    )
  }

  /**
   * Get processing statistics for a job
   */
  static async getJobStatistics(jobId: string): Promise<{
    totalRuns: number
    lastRun: Date | null
    totalProcessed: number
    totalErrors: number
    totalCost: number
    successRate: number
  }> {
    const jobs = await prisma.processingJob.findMany({
      where: { jobId }
    })

    if (jobs.length === 0) {
      return {
        totalRuns: 0,
        lastRun: null,
        totalProcessed: 0,
        totalErrors: 0,
        totalCost: 0,
        successRate: 0
      }
    }

    const totalProcessed = jobs.reduce((sum, job) => sum + job.processedCount, 0)
    const totalErrors = jobs.reduce((sum, job) => sum + job.errorCount, 0)
    const totalCost = jobs.reduce((sum, job) => sum + job.totalCost, 0)
    const lastRun = jobs.reduce((latest, job) =>
      job.startedAt > (latest || new Date(0)) ? job.startedAt : latest,
      null as Date | null
    )

    return {
      totalRuns: jobs.length,
      lastRun,
      totalProcessed,
      totalErrors,
      totalCost,
      successRate: totalProcessed > 0 ? ((totalProcessed - totalErrors) / totalProcessed) * 100 : 0
    }
  }
}