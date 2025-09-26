import { NextRequest, NextResponse } from 'next/server'
import { costMonitor } from '@/lib/ai/cost-monitor'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { ceipal } from '@/lib/ceipal/client'
import { llamaParser } from '@/lib/ai/llama-parser'
import { uploadBufferToS3, makeResumeKey } from '@/lib/storage/s3'
import { chatComplete } from '@/lib/ai/openai'
import { generateCandidateEmbedding, storeEmbedding } from '@/lib/ai/embeddings'
import { ProcessingTracker } from '@/lib/processing/tracker'

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg, code }, { status: code })
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function validateResumeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    // Check for reasonable URL length and no null/undefined strings
    // Allow pathname of "/" (length 1) for URLs like ftp://server.com/
    return url.length > 15 && !url.includes('null') && !url.includes('undefined') && parsed.pathname.length >= 1
  } catch {
    return false
  }
}

// Helper function to safely log to tracker
async function safeLog(tracker: ProcessingTracker | undefined, entry: { level: 'info' | 'warning' | 'error' | 'success'; message: string; applicantId?: string; applicantName?: string; details?: Record<string, any> }) {
  if (tracker) {
    try {
      await tracker.log(entry)
    } catch (err) {
      console.error('[fetch-applicants] Tracker logging failed:', err)
    }
  }
}

async function safeUpdateCounters(tracker: ProcessingTracker | undefined, updates: any) {
  if (tracker) {
    try {
      await tracker.updateCounters(updates)
    } catch (err) {
      console.error('[fetch-applicants] Tracker counter update failed:', err)
    }
  }
}

interface DeduplicationCheck {
  shouldSkip: boolean
  reason: string
}

async function checkDeduplication(
  applicant: any,
  submission: any,
  parsingMode: string
): Promise<DeduplicationCheck> {
  const applicantId = applicant?.id
  const name = applicant?.name || 'Unknown'

  // Check if applicant already has complete basic info (basic mode only)
  if (parsingMode === 'none' && applicant) {
    const hasCompleteBasicInfo =
      applicant.status === 'imported' &&
      applicant.name &&
      !applicant.name.includes('Applicant ') && // Skip placeholder names
      (applicant.email || applicant.phone) // At least one contact method

    if (hasCompleteBasicInfo) {
      return {
        shouldSkip: true,
        reason: `already has complete basic info (status: ${applicant.status})`
      }
    }
  }

  // Check if applicant already parsed (parsing mode only)
  if (parsingMode === 'llamaparse' && applicantId) {
    const alreadyParsed = await prisma.parsedProfile.findUnique({
      where: { applicantId },
      select: { id: true }
    })
    if (alreadyParsed) {
      return {
        shouldSkip: true,
        reason: 'already has parsed profile'
      }
    }
  }

  // Check submission-level deduplication
  const ceipalSubmissionId = String(submission?.submission_id || submission?.id || '')
  const incomingModified: string | undefined = submission?.modified || submission?.submitted_on || submission?.submittedOn

  if (ceipalSubmissionId && incomingModified) {
    try {
      const existingSub = await prisma.submission.findUnique({
        where: { ceipalId: ceipalSubmissionId },
        select: {
          modified: true,
          applicant: { select: { status: true } }
        }
      })

      if (existingSub?.modified && existingSub.modified >= incomingModified) {
        // For basic mode: skip if submission not newer
        if (parsingMode === 'none') {
          return {
            shouldSkip: true,
            reason: `submission not modified since ${incomingModified}`
          }
        }
        // For parsing mode: skip only if already parsed
        if (parsingMode === 'llamaparse' && existingSub.applicant?.status === 'parsed') {
          return {
            shouldSkip: true,
            reason: `submission not modified since ${incomingModified} and already parsed`
          }
        }
      }
    } catch (err) {
      console.warn(`[fetch-applicants] Deduplication check failed for ${name}, proceeding:`, err)
    }
  }

  return { shouldSkip: false, reason: 'processing needed' }
}

async function uploadWithRetry(uploadFn: () => Promise<void>, retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    try {
      await uploadFn()
      return true
    } catch (error) {
      console.warn(`[fetch-applicants] Upload attempt ${i + 1} failed:`, error)
      if (i === retries) {
        console.error('[fetch-applicants] Final upload attempt failed:', error)
        return false
      }
      await sleep(1000 * (i + 1)) // Progressive backoff
    }
  }
  return false
}

function parseJsonLenient(text: string): any {
  let t = String(text || '').trim()
  // Strip common markdown fences
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z0-9]*\s*/i, '')
    if (t.endsWith('```')) t = t.replace(/\s*```$/i, '')
  }
  // Trim again
  t = t.trim()
  // If still not valid, try to extract first JSON object block
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = t.slice(start, end + 1)
      return JSON.parse(candidate)
    }
    throw new Error('Invalid JSON from extractor')
  }
}

async function parseWithRetry(buffer: Buffer, filename: string, retries = 2): Promise<{ result: any; usage: any }> {
  let attempt = 0
  let lastErr: unknown
  while (attempt <= retries) {
    try {
      return await llamaParser.parseDocument(buffer, filename)
    } catch (err: any) {
      lastErr = err
      const msg = err?.error?.message || err?.message || String(err)
      console.warn(`[llama-parse] attempt ${attempt + 1} failed: ${msg}`)
      if (attempt === retries) break
      await sleep(2000 * (attempt + 1))
      attempt++
    }
  }
  throw lastErr
}

async function upsertSubmissionSafe(db: typeof prisma, jobId: string, applicantId: string, ceipalSubmissionId: string, data: {
  resumeUrl?: string | null
  submittedOn?: string | null
  source?: string | null
  pipelineStatus?: string | null
  submissionStatus?: string | null
  modified?: string | null
  jobSeekerCeipalId?: string | null
}) {
  // Prefer ceipalId; if not found and applicant already has a submission, update it
  const existingByCeipal = await db.submission.findUnique({ where: { ceipalId: ceipalSubmissionId }, select: { id: true } })
  if (existingByCeipal) {
    return db.submission.update({ where: { ceipalId: ceipalSubmissionId }, data })
  }
  const existingByApplicant = await db.submission.findUnique({ where: { applicantId }, select: { id: true, ceipalId: true } })
  if (existingByApplicant) {
    return db.submission.update({ where: { applicantId }, data: { ...data, ceipalId: ceipalSubmissionId } })
  }
  return db.submission.create({ data: { ceipalId: ceipalSubmissionId, applicantId, jobId, ...data } as any })
}

function findEncryptedApplicantId(submission: any): string | undefined {
  // Commonly observed keys that may hold the Ceipal-secure applicant ID
  const candidates = [
    submission?.jobSeekerCeipalId,
    submission?.job_seeker_ceipal_id,
    submission?.job_seeker_id,
    submission?.jobSeekerId,
    submission?.applicantCeipalId,
    submission?.applicant_ceipal_id,
    submission?.ceipalApplicantGuid,
    submission?.ceipal_applicant_guid,
    submission?.applicantGuid,
    submission?.applicant_guid,
  ].filter(Boolean)

  if (candidates.length) return String(candidates[0])

  // Heuristic: any string property with key containing 'applicant' and 'id' that looks like a Ceipal GUID
  for (const [k, v] of Object.entries(submission || {})) {
    if (typeof v === 'string' && /applicant/i.test(k) && /id/i.test(k)) {
      // Ceipal IDs often look like URL-safe base64 with '-' and '_' and may end with '='
      if (/^[A-Za-z0-9_-]+=*$/.test(v) && v.length >= 24) {
        return v
      }
    }
  }
  return undefined
}

export async function POST(req: NextRequest) {
  let tracker: ProcessingTracker | undefined

  try {
    const body = await req.json()
    const { jobId, parsingMode = 'none', retryFailedOnly = false } = body

    if (!jobId) {
      return bad('job_id_required', 400)
    }

    console.log(`[fetch-applicants] API called for jobId: ${jobId}, parsing mode: ${parsingMode}, retry: ${retryFailedOnly}`)

    // Get job details first (accept either internal id or ceipalId)
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { id: String(jobId) },
          { ceipalId: String(jobId) }
        ]
      },
      select: { id: true, ceipalId: true, jobCode: true, title: true, description: true, requisitionDescription: true }
    } )

    if (!job) {
      return bad('job_not_found', 404)
    }

    console.log(`[fetch-applicants] Found job: ${job.jobCode} - ${job.title}`)

    // Use the Ceipal ID for API calls (required for submissions)
    const ceipalJobId = job.ceipalId
    if (!ceipalJobId) {
      return bad('ceipal_job_id_required', 400)
    }

    // Fetch submissions from Ceipal API
    const ceipalClient = ceipal()

    // Incremental: find latest submission modified date for this job
    const latestSub = await prisma.submission.findFirst({ where: { jobId: job.id }, orderBy: { modified: 'desc' }, select: { modified: true, createdAt: true } })
    const latestStr = latestSub?.modified || (latestSub?.createdAt ? latestSub.createdAt.toISOString().slice(0, 19).replace('T', ' ') : undefined)

    console.log(`[fetch-applicants] Fetching submissions for Ceipal job ID: ${ceipalJobId}${latestStr ? `, modifiedAfter: ${latestStr}` : ''}`)
    const submissionsData = await ceipalClient.getAllSubmissionsForJob(ceipalJobId, 20, 100, { modifiedAfter: latestStr })

    let submissionsList = submissionsData ? [...submissionsData] : []
    // Always merge backlog for LlamaParse so previously basic-only candidates get parsed
    if (parsingMode === 'llamaparse') {
    const backlog = await prisma.submission.findMany({
    where: { jobId: job.id, applicant: { parsedProfile: null } },
    select: {
    ceipalId: true,
    resumeUrl: true,
    modified: true,
    source: true,
    pipelineStatus: true,
    submissionStatus: true,
    submittedOn: true,
    jobSeekerCeipalId: true,
    applicant: { select: { ceipalId: true, name: true } },
    },
    })
    const backlogMapped = backlog.map((b: any) => ({
    id: b.ceipalId,
    submission_id: b.ceipalId,
    resume: b.resumeUrl,
    modified: b.modified,
    source: b.source,
    pipeline_status: b.pipelineStatus,
    submission_status: b.submissionStatus,
    submitted_on: b.submittedOn,
    job_seeker_id: b.jobSeekerCeipalId || b.applicant?.ceipalId,
    applicant_id: b.applicant?.ceipalId,
    applicantName: b.applicant?.name || (b.applicant?.ceipalId ? `Applicant ${b.applicant.ceipalId}` : 'Applicant'),
    }))
    const merged = [...submissionsList, ...backlogMapped]
    const seen = new Set<string>()
    submissionsList = merged.filter((s: any) => {
      const key = String(s.submission_id || s.id || s.applicant_id || s.job_seeker_id || '')
    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
    })
    console.log(`[fetch-applicants] LlamaParse backlog merged: api=${submissionsData?.length || 0}, backlog=${backlogMapped.length}, unique=${submissionsList.length}`)
    }

    // If retry mode is enabled, filter to only failed applicants
    if (retryFailedOnly) {
      const failedApplicants = await ProcessingTracker.getFailedApplicants(job.id)
      console.log(`[fetch-applicants] Retry mode: found ${failedApplicants.length} failed applicants`)

      if (failedApplicants.length === 0) {
        console.log(`[fetch-applicants] No failed applicants found for retry`)
        return NextResponse.json({
          success: true,
          jobId,
          jobCode: job.jobCode,
          parsingMode,
          totalSubmissions: 0,
          processedCount: 0,
          errorCount: 0,
          errors: [],
          message: 'No failed applicants found for retry',
          costs: { totalCost: 0, breakdown: { parsing: 0, openai: 0, embedding: 0 } }
        })
      }

      // Filter submissions to only include those that failed
      const failedNames = new Set(failedApplicants.map(f => f.applicantName))
      const originalLength = submissionsList.length
      submissionsList = submissionsList.filter((submission: any) => {
        const name = submission.applicantName ||
                    `${submission.applicantFirstName || ''} ${submission.applicantLastName || ''}`.trim() ||
                    `Applicant ${submission.ceipalApplicantId || submission.applicant_id || submission.id}`
        return failedNames.has(name)
      })
      console.log(`[fetch-applicants] Filtered submissions for retry: ${originalLength} → ${submissionsList.length}`)
    }

    if (!submissionsList || submissionsList.length === 0) {
    console.log(`[fetch-applicants] No submissions found for job ${job.jobCode}`)
    return NextResponse.json({
    success: true,
      jobId,
        jobCode: job.jobCode,
           parsingMode,
        totalSubmissions: 0,
        processedCount: 0,
        errorCount: 0,
        errors: [],
        costs: { totalCost: 0, breakdown: { parsing: 0, openai: 0 } }
      })
    }
 
    console.log(`[fetch-applicants] Found ${submissionsList.length} submissions for job ${job.jobCode}`)

    // Check for existing running processing job to prevent concurrent processing
    const existingRunningJob = await prisma.processingJob.findFirst({
      where: {
        jobId: job.id,
        status: 'running'
      },
      select: {
        id: true,
        startedAt: true,
        parsingMode: true,
        totalSubmissions: true,
        processedCount: true
      }
    })

    if (existingRunningJob) {
      const elapsedMinutes = Math.floor((Date.now() - existingRunningJob.startedAt.getTime()) / (1000 * 60))

      // If job has been running for more than 30 minutes with no progress, consider it stale
      if (elapsedMinutes > 30 && existingRunningJob.processedCount === 0) {
        console.log(`[fetch-applicants] Found stale processing job ${existingRunningJob.id}, marking as failed`)
        await prisma.processingJob.update({
          where: { id: existingRunningJob.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            durationMs: Date.now() - existingRunningJob.startedAt.getTime()
          }
        })
      } else {
        console.log(`[fetch-applicants] Processing already in progress for job ${job.jobCode} (started ${elapsedMinutes} minutes ago)`)
        return NextResponse.json({
          error: 'processing_already_in_progress',
          message: `Another user is already processing this job. Started ${elapsedMinutes} minutes ago.`,
          existingProcessingJobId: existingRunningJob.id,
          code: 409
        }, { status: 409 })
      }
    }

    // Create processing tracker
    tracker = await ProcessingTracker.createJob(job.id, job.jobCode || undefined, parsingMode, submissionsList.length)

    const results = {
      success: true,
      jobId,
      jobCode: job.jobCode,
      parsingMode,
      totalSubmissions: submissionsList.length,
      processedCount: 0,
      errorCount: 0,
      errors: [] as string[],
      costs: {
        totalCost: 0,
        breakdown: {
          parsing: 0,
          openai: 0,
          embedding: 0
        }
      },
      processingJobId: (await tracker.getJobInfo()).id
    }

    // Process each real submission
    for (const submission of submissionsList) {
      try {
        // Extract applicant details from submission
        const applicantId = submission.ceipalApplicantId || submission.applicant_id || submission.id
        const name = submission.applicantName ||
                    `${submission.applicantFirstName || ''} ${submission.applicantLastName || ''}`.trim() ||
                    `Applicant ${applicantId}`

        console.log(`[fetch-applicants] Processing applicant: ${name}`)

        // Check existing applicant to avoid redundant processing
        const existingApplicant = await prisma.applicant.findUnique({
          where: { ceipalId: String(applicantId) },
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            name: true,
            createdAt: true,
            updatedAt: true
          }
        })

        // Check if we should skip this applicant based on deduplication rules
        const dedupeCheck = await checkDeduplication(existingApplicant, submission, parsingMode)
        if (dedupeCheck.shouldSkip) {
          console.log(`[fetch-applicants] Skipping ${name} - ${dedupeCheck.reason}`)
          await safeLog(tracker, {
            level: 'info',
            message: `Skipped processing: ${dedupeCheck.reason}`,
            applicantId: existingApplicant?.id,
            applicantName: name
          })
          continue
        }

        // Get additional applicant details if possible (prefer encrypted id present in submission)
        // Always fetch when the derived submission name looks like a placeholder ("Applicant <id>")
        let applicantDetails: any = null
        const encId = findEncryptedApplicantId(submission)
        const looksPlaceholder = /^Applicant\s+\d+$/i.test(name)
        const shouldSkip = !!(existingApplicant && (existingApplicant.email || existingApplicant.phone) && !looksPlaceholder)
        const idForDetails = shouldSkip
          ? undefined
          : (encId || (typeof applicantId === 'string' && /[A-Za-z_-]/.test(applicantId) ? applicantId : undefined))
        if (!idForDetails && shouldSkip) {
          console.log(`[fetch-applicants] Skipping Applicant Details fetch for ${name} (already has contact info)`) }
        if (idForDetails) {
          try {
            console.log(`[fetch-applicants] Fetching Applicant Details for id=${String(idForDetails).slice(0,8)}...`)
            applicantDetails = await ceipalClient.getApplicantDetails(String(idForDetails))
          } catch (error) {
            console.warn(`[fetch-applicants] Could not fetch applicant details for ID ${idForDetails}:`, error)
          }
        }

        // Prefer names from applicant details if available
        const firstName = applicantDetails?.firstname || applicantDetails?.first_name || ''
        const lastName = applicantDetails?.lastname || applicantDetails?.last_name || ''
        const consultantName = applicantDetails?.consultant_name || ''
        const derivedName = (firstName || lastName)
          ? `${firstName} ${lastName}`.trim()
          : (consultantName || name)

        // Extract contact info (from applicant details, falling back to submission fields)
        const email = applicantDetails?.email
          || applicantDetails?.email_address_1
          || submission.applicantEmail
          || submission.email

        const phone = applicantDetails?.mobile_number
          || applicantDetails?.phone_number
          || applicantDetails?.home_phone_number
          || applicantDetails?.work_phone_number
          || applicantDetails?.mobile
          || applicantDetails?.phone
          || submission.applicantPhone
          || submission.phone
          || submission.mobile

        // Optional: basic location from details
        const location = [
          applicantDetails?.city,
          applicantDetails?.state,
          applicantDetails?.country
        ].filter(Boolean).join(', ') || undefined

        // Log resume URL sources for debugging
        const resumeUrlSources = {
          submission_merged_pdf: !!submission.merged_pdf_document,
          submission_resume: !!submission.resume,
          submission_mergedPdf: !!submission.mergedPdfDocument,
          submission_resume_url: !!submission.resume_url,
          applicant_details_doc: !!applicantDetails?.documents?.[0]?.resume_path
        }
        console.log('[fetch-applicants] Basic info derived', { name: derivedName, hasEmail: !!email, hasPhone: !!phone, location, resumeUrlSources })
 
        // Create/update applicant in database
        const applicant = await prisma.applicant.upsert({
          where: {
            ceipalId: String(applicantId)
          },
          update: {
            name: derivedName,
            email,
            phone,
            location,
            status: 'imported'
          },
          create: {
            ceipalId: String(applicantId),
            jobId: job.id,
            name: derivedName,
            email,
            phone,
            location,
            status: 'imported'
          }
        })

        console.log('[fetch-applicants] Basic info persisted', { applicantId: applicant.id, ceipalId: String(applicantId), hasEmail: !!email, hasPhone: !!phone })

        // Log applicant creation/update
        await safeLog(tracker, {
          level: 'success',
          message: 'Applicant profile created/updated',
          applicantId: applicant.id,
          applicantName: derivedName,
          details: { hasEmail: !!email, hasPhone: !!phone, location }
        })

        // Create/update submission record (safe against unique(applicantId) conflicts)
        await upsertSubmissionSafe(prisma, job.id, applicant.id, String(submission.submission_id || submission.id), {
          resumeUrl: submission.merged_pdf_document || submission.resume || submission.mergedPdfDocument || submission.resume_url,
          submittedOn: submission.submitted_on || submission.submittedOn,
          source: submission.source,
          pipelineStatus: submission.pipeline_status || submission.pipelineStatus,
          submissionStatus: submission.submission_status || submission.submissionStatus,
          modified: submission.modified,
          jobSeekerCeipalId: submission.job_seeker_id || submission.jobSeekerId || submission.jobSeekerCeipalId || submission.job_seeker_ceipal_id || encId
        })


        if (parsingMode === 'none') {
          // Basic processing - store contact info and optionally upload resume to S3 (no parsing)
          let uploadSuccess = false
          try {
            // Use transaction for atomic resume operations
            await prisma.$transaction(async (tx) => {
              // Check if resume already exists within transaction
              const existingResume = await tx.resume.findUnique({ where: { applicantId: applicant.id }, select: { s3Key: true } })
              if (!existingResume) {
                // Get resume URL with priority order
                let resumeUrl: string | undefined = submission.merged_pdf_document || submission.resume || submission.mergedPdfDocument || submission.resume_url

                // Fallback to applicant details documents
                if (!resumeUrl) {
                  const docPath = applicantDetails?.documents?.[0]?.resume_path
                  if (docPath) resumeUrl = String(docPath)
                }

                // Last resort: fetch fresh details using encrypted ID
                if (!resumeUrl) {
                  const encIdNow = findEncryptedApplicantId(submission)
                  if (encIdNow) {
                    try {
                      const latestDetails = await ceipalClient.getApplicantDetails(String(encIdNow))
                      const doc2 = latestDetails?.documents?.[0]?.resume_path
                      if (doc2) resumeUrl = String(doc2)
                    } catch (err) {
                      console.warn(`[fetch-applicants] Fallback details fetch failed for ${name}:`, err)
                    }
                  }
                }

                console.log(`[fetch-applicants] Final resume URL for ${name}: ${resumeUrl ? resumeUrl.slice(0, 50) + '...' : 'none'}`)

                if (resumeUrl && validateResumeUrl(resumeUrl)) {
                  // Download resume
                  const arrayBuf = await ceipalClient.downloadResume(String(resumeUrl))
                  const buffer = Buffer.from(arrayBuf)

                  // Determine file extension and MIME type
                  const urlExt = (() => {
                    try {
                      const u = new URL(String(resumeUrl))
                      const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/)
                      return (m?.[1] || 'pdf').toLowerCase()
                    } catch { return 'pdf' }
                  })()

                  const safeBase = (firstName || lastName || consultantName || name || 'resume').replace(/\s+/g, '_')
                  const filename = `${safeBase}.${urlExt}`
                  const mime = urlExt === 'pdf' ? 'application/pdf' : (urlExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream')
                  const s3Key = makeResumeKey({ jobCode: job.jobCode, applicantCeipalId: applicant.ceipalId, filename })

                  // Upload with retry logic
                  uploadSuccess = await uploadWithRetry(async () => {
                    await uploadBufferToS3({ buffer, key: s3Key, contentType: mime, metadata: { jobId: job.id, applicantId: applicant.id } })
                  })

                  if (uploadSuccess) {
                    await tx.resume.upsert({
                      where: { applicantId: applicant.id },
                      update: { s3Key, mimeType: mime, sizeBytes: buffer.length },
                      create: { applicantId: applicant.id, s3Key, mimeType: mime, sizeBytes: buffer.length },
                    })
                    console.log(`[fetch-applicants] Uploaded resume to S3 for ${name}: ${s3Key}`)
                    await safeLog(tracker, {
                      level: 'success',
                      message: 'Resume uploaded to S3',
                      applicantId: applicant.id,
                      applicantName: name,
                      details: { s3Key, mimeType: mime, sizeBytes: buffer.length }
                    })
                    await safeUpdateCounters(tracker, { s3UploadCount: 1 })
                  } else {
                    throw new Error('S3 upload failed after retries')
                  }
                } else {
                  console.log(`[fetch-applicants] No valid resume URL found for ${name} — skipped upload`)
                }
              } else {
                console.log(`[fetch-applicants] Resume already in S3 for ${name}, skipping upload`)
                uploadSuccess = true // Consider existing resume as success
              }
            })
          } catch (e) {
            console.error(`[fetch-applicants] S3 upload (basic) failed for ${name}:`, e)
            results.errorCount++
            results.errors.push(`S3 upload failed for ${name}: ${e instanceof Error ? e.message : e}`)
            await safeLog(tracker, {
              level: 'error',
              message: `S3 upload failed: ${e instanceof Error ? e.message : e}`,
              applicantId: applicant.id,
              applicantName: name
            })
            await safeUpdateCounters(tracker, {
              errorCount: 1,
              errors: [`S3 upload failed for ${name}: ${e instanceof Error ? e.message : e}`],
              failedApplicants: [name]
            })
          }
          console.log(`[fetch-applicants] Basic processing for ${name} - stored contact info`)
          results.processedCount++
          await safeUpdateCounters(tracker, {
            processedCount: 1,
            successfulApplicants: [name]
          })

        } else if (parsingMode === 'llamaparse') {
          // LlamaParse: download resume from Ceipal and parse to markdown
          try {

            const resumeUrl = submission.merged_pdf_document || submission.resume || submission.mergedPdfDocument || submission.resume_url
            if (!resumeUrl || !validateResumeUrl(resumeUrl)) {
              throw new Error(`No valid resume URL found for ${name}. URL: ${resumeUrl || 'none'}`)
            }
            console.log(`[fetch-applicants] Using resume URL for ${name}: ${resumeUrl.slice(0, 50)}...`)

            // Download resume via authenticated Ceipal client
            const arrayBuf = await ceipalClient.downloadResume(String(resumeUrl))
            const buffer = Buffer.from(arrayBuf)
            // Infer extension from resumeUrl; default to pdf
            const urlExt = (() => {
              try {
                const u = new URL(String(resumeUrl))
                const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/)
                return (m?.[1] || 'pdf').toLowerCase()
              } catch { return 'pdf' }
            })()
            const safeBase = (firstName || lastName || consultantName || name || 'resume').replace(/\s+/g, '_')
            const filename = `${safeBase}.${urlExt}`
            const mime = urlExt === 'pdf' ? 'application/pdf' : (urlExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream')

            // Upload to S3 with transaction and retry logic
            let s3UploadSuccess = false
            await prisma.$transaction(async (tx) => {
              const existingResume = await tx.resume.findUnique({ where: { applicantId: applicant.id }, select: { s3Key: true } })
              let s3Key = existingResume?.s3Key

              if (!s3Key) {
                s3Key = makeResumeKey({ jobCode: job.jobCode, applicantCeipalId: applicant.ceipalId, filename })

                // Upload with retry logic
                s3UploadSuccess = await uploadWithRetry(async () => {
                  await uploadBufferToS3({ buffer, key: s3Key!, contentType: mime, metadata: { jobId: job.id, applicantId: applicant.id } })
                })

                if (s3UploadSuccess) {
                  await tx.resume.upsert({
                    where: { applicantId: applicant.id },
                    update: { s3Key, mimeType: mime, sizeBytes: buffer.length },
                    create: { applicantId: applicant.id, s3Key, mimeType: mime, sizeBytes: buffer.length },
                  })
                  console.log(`[fetch-applicants] Uploaded resume to S3 for ${name}: ${s3Key}`)
                } else {
                  console.warn(`[fetch-applicants] S3 upload failed for ${name}, proceeding with parsing anyway`)
                }
              } else {
                console.log(`[fetch-applicants] Resume already in S3 for ${name}, skipping upload`)
                s3UploadSuccess = true
              }
            })

            // Parse with small retry; treat 0 pages as failure
            const { result: parsed, usage } = await parseWithRetry(buffer, filename, 2)

            if ((!usage.pages || usage.pages <= 0) && (!parsed.markdown || parsed.markdown.trim().length === 0)) {
              console.warn(`[fetch-applicants] LlamaParse returned 0 pages and empty markdown for ${name} — skipping profile write`)
              results.errorCount++
              results.errors.push(`LlamaParse empty for ${name}`)
            } else {
              // Track costs (non-blocking)
              try {
                const rec = await costMonitor.trackLlamaParse('parse_resume', usage)
                results.costs.breakdown.parsing += rec.cost
                await safeUpdateCounters(tracker, { parsingCost: rec.cost })
                await safeLog(tracker, {
                  level: 'success',
                  message: `Resume parsed: ${usage.pages} pages, cost: $${rec.cost.toFixed(4)}`,
                  applicantId: applicant.id,
                  applicantName: name,
                  details: { pages: usage.pages, cost: rec.cost }
                })
              } catch (err) {
                console.warn('[fetch-applicants] Cost tracking failed, continuing:', err)
              }

              // Extract structured profile using OpenAI
              const jobContext = `Job: ${job.title || ''}\nDescription:\n${(job as any).requisitionDescription || job.description || ''}`
              const system = 'You are a strict JSON generator. Output only raw JSON matching the schema. No code fences, no markdown, no comments.'
              const schema = `{
  "fullName": string,
  "emails": string[],
  "phones": string[],
  "location": string|null,
  "skills": string[],
  "titles": string[],
  "totalExpMonths": number,
  "education": Array<{ degree: string, field?: string, institution?: string, graduationYear?: number }>,
  "companies": Array<{ company: string, title?: string, start?: string, end?: string, durationMonths?: number }>,
  "certifications": string[]
}`
              const user = `Resume (Markdown):\n\n${parsed.markdown}\n\nContext:\n${jobContext}\n\nReturn JSON matching schema: ${schema}`
              let extracted: any = {}
              try {
                const jsonText = await chatComplete([
                  { role: 'system', content: system },
                  { role: 'user', content: user }
                ])
                extracted = parseJsonLenient(jsonText)
              } catch (err) {
                console.warn('[fetch-applicants] OpenAI extraction failed, storing markdown only:', err)
              }

              // Store parsed profile (markdown + metadata + extraction), and update columns when available
              await prisma.parsedProfile.upsert({
                where: { applicantId: applicant.id },
                update: {
                  json: { markdown: parsed.markdown, metadata: parsed.metadata, extracted },
                  skills: Array.isArray(extracted?.skills) ? extracted.skills.slice(0, 200) : [],
                  titles: Array.isArray(extracted?.titles) ? extracted.titles.slice(0, 200) : [],
                  location: extracted?.location || null,
                  totalExpMonths: typeof extracted?.totalExpMonths === 'number' ? extracted.totalExpMonths : 0,
                  parsedAt: new Date(),
                },
                create: {
                  applicantId: applicant.id,
                  json: { markdown: parsed.markdown, metadata: parsed.metadata, extracted },
                  skills: Array.isArray(extracted?.skills) ? extracted.skills.slice(0, 200) : [],
                  titles: Array.isArray(extracted?.titles) ? extracted.titles.slice(0, 200) : [],
                  location: extracted?.location || null,
                  totalExpMonths: typeof extracted?.totalExpMonths === 'number' ? extracted.totalExpMonths : 0,
                }
              })

              // Mark applicant as parsed
              await prisma.applicant.update({ where: { id: applicant.id }, data: { status: 'parsed' } })

              // Generate and store embedding for semantic search
              try {
                const embedding = await generateCandidateEmbedding(
                  parsed.markdown || '',
                  extracted?.skills || [],
                  extracted?.titles || []
                )
                await storeEmbedding(applicant.id, embedding)
                console.log(`[fetch-applicants] Generated embedding for ${name} (${embedding.length} dimensions)`)
                await safeLog(tracker, {
                  level: 'success',
                  message: `Embedding generated (${embedding.length} dimensions)`,
                  applicantId: applicant.id,
                  applicantName: name
                })
                await safeUpdateCounters(tracker, { embeddingCount: 1 })
              } catch (embErr) {
                console.warn(`[fetch-applicants] Embedding generation failed for ${name}:`, embErr)
                await safeLog(tracker, {
                  level: 'warning',
                  message: `Embedding generation failed: ${embErr instanceof Error ? embErr.message : embErr}`,
                  applicantId: applicant.id,
                  applicantName: name
                })
                // Don't fail the entire process for embedding errors
              }

              console.log(`[fetch-applicants] LlamaParse processed for ${name}: ${usage.pages} pages (extracted skills=${(extracted?.skills||[]).length})`)
              results.processedCount++
              await safeUpdateCounters(tracker, {
                processedCount: 1,
                parsedCount: 1,
                successfulApplicants: [name]
              })
            }
          } catch (e) {
            console.error(`[fetch-applicants] LlamaParse failed for ${name}:`, e)
            results.errorCount++
            results.errors.push(`LlamaParse failed for ${name}: ${e instanceof Error ? e.message : e}`)
            await safeLog(tracker, {
              level: 'error',
              message: `LlamaParse failed: ${e instanceof Error ? e.message : e}`,
              applicantId: applicant.id,
              applicantName: name
            })
            await safeUpdateCounters(tracker, {
              errorCount: 1,
              errors: [`LlamaParse failed for ${name}: ${e instanceof Error ? e.message : e}`],
              failedApplicants: [name]
            })
          }

        } else if (parsingMode === 'landingai') {
          // TODO: Implement actual Landing AI processing with resume download
          console.log(`[fetch-applicants] Landing AI processing for ${name} - TODO: implement resume parsing`)
          results.processedCount++
        }

      } catch (error) {
        console.error(`[fetch-applicants] Failed to process submission:`, error)
        results.errorCount++
        results.errors.push(`Failed to process submission: ${error}`)
        await safeLog(tracker, {
          level: 'error',
          message: `Failed to process submission: ${error}`,
          details: { error: String(error) }
        })
        await safeUpdateCounters(tracker, {
          errorCount: 1,
          errors: [`Failed to process submission: ${error}`]
        })
      }
    }

    results.costs.totalCost = results.costs.breakdown.parsing + results.costs.breakdown.openai + results.costs.breakdown.embedding

    // Update final costs and complete the tracking
    await safeUpdateCounters(tracker, {
      totalCost: results.costs.totalCost,
      openaiCost: results.costs.breakdown.openai,
      embeddingCost: results.costs.breakdown.embedding
    })

    // Complete the processing job
    const jobInfo = tracker ? await tracker.complete() : null

    console.log(`[fetch-applicants] Completed processing: ${results.processedCount}/${results.totalSubmissions} successful, ${results.errorCount} errors, total cost: $${results.costs.totalCost.toFixed(4)}`)

    // Get recent logs for the response
    const recentLogs = tracker ? await tracker.getLogs(20) : []

    return NextResponse.json({
      ...results,
      processingJob: jobInfo ? {
        id: jobInfo.id,
        status: jobInfo.status,
        startedAt: jobInfo.startedAt,
        completedAt: jobInfo.completedAt,
        durationMs: jobInfo.durationMs,
        counters: {
          s3UploadCount: jobInfo.s3UploadCount,
          parsedCount: jobInfo.parsedCount,
          embeddingCount: jobInfo.embeddingCount
        }
      } : null,
      logs: recentLogs
    })

  } catch (error) {
    console.error('[fetch-applicants] Failed:', error)
    // If we have a tracker, mark the job as failed
    try {
      if (tracker) {
        await tracker.fail(error instanceof Error ? error.message : String(error))
      }
    } catch (trackerErr) {
      console.error('[fetch-applicants] Tracker failure logging failed:', trackerErr)
    }
    return bad('fetch_applicants_failed', 500)
  }
}