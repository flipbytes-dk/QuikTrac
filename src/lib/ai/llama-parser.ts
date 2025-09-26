import { getEnv } from '@/lib/env'

export interface LlamaParseResponse {
  markdown: string
  metadata: {
    job_id: string
    filename: string
    page_count: number
    processing_duration_ms: number
    [key: string]: any
  }
}

export interface LlamaParseUsage {
  jobId: string
  processingTimeMs: number
  pages: number
  fileSize: number
  success: boolean
  error?: string
}

export class LlamaParser {
  private apiKey: string
  private baseUrl: string

  constructor() {
    const env = getEnv()
    if (!env.LLAMAINDEX_API_KEY) {
      throw new Error('LLAMAINDEX_API_KEY is required for LlamaParse')
    }
    this.apiKey = env.LLAMAINDEX_API_KEY!
    this.baseUrl = 'https://api.cloud.llamaindex.ai/api/parsing'
  }

  async parseDocument(buffer: Buffer, filename: string): Promise<{
    result: LlamaParseResponse
    usage: LlamaParseUsage
  }> {
    const startTime = Date.now()
    let jobId = ''

    try {
      console.log(`[llama-parse] Starting parse for ${filename}`)

      // Step 1: Upload document
      const formData = new FormData()
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      formData.append('file', new Blob([arrayBuffer]), filename)

      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error(`[llama-parse] Upload error: ${uploadResponse.status} ${errorText}`)
        throw new Error(`LlamaParse upload error: ${uploadResponse.status} ${errorText}`)
      }

      const uploadResult = await uploadResponse.json()
      jobId = uploadResult.job_id || uploadResult.id

      if (!jobId) {
        throw new Error('No job ID returned from upload')
      }

      console.log(`[llama-parse] Upload successful, job ID: ${jobId}`)

      // Step 2: Poll for completion
      const result = await this.pollForCompletion(jobId)
      const processingTimeMs = Date.now() - startTime

      console.log(`[llama-parse] Parse completed in ${processingTimeMs}ms, ${result.metadata.page_count || 0} pages`)

      const usage: LlamaParseUsage = {
        jobId,
        processingTimeMs,
        pages: result.metadata.page_count || 0,
        fileSize: buffer.length,
        success: true,
      }

      return {
        result: {
          ...result,
          metadata: {
            ...result.metadata,
            job_id: jobId,
            filename,
            processing_duration_ms: processingTimeMs,
          }
        },
        usage
      }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      console.error(`[llama-parse] Parse failed after ${processingTimeMs}ms:`, error)

      const usage: LlamaParseUsage = {
        jobId,
        processingTimeMs,
        pages: 0,
        fileSize: buffer.length,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }

      throw { error, usage }
    }
  }

  private async pollForCompletion(jobId: string, maxAttempts = 60): Promise<LlamaParseResponse> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check status
        const statusResponse = await fetch(`${this.baseUrl}/job/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`)
        }

        const status = await statusResponse.json()

        if (status.status === 'ERROR' || status.status === 'FAILED') {
          throw new Error(`Job failed: ${status.error || 'Unknown error'}`)
        }

        if (status.status === 'SUCCESS' || status.status === 'COMPLETED') {
          console.log(`[llama-parse] Job ${jobId} completed, fetching results`)

          // Get markdown result
          const resultResponse = await fetch(`${this.baseUrl}/job/${jobId}/result/markdown`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          })

          if (!resultResponse.ok) {
            throw new Error(`Result fetch failed: ${resultResponse.status}`)
          }

          const markdown = await resultResponse.text()

          return {
            markdown,
            metadata: {
              job_id: jobId,
              filename: '',
              page_count: status.page_count || 0,
              processing_duration_ms: 0,
              ...status,
            }
          }
        }

        // Still processing, wait and retry
        console.log(`[llama-parse] Job ${jobId} still processing (attempt ${attempt}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 5000))

      } catch (error) {
        if (attempt === maxAttempts) {
          throw error
        }
        console.warn(`[llama-parse] Polling attempt ${attempt} failed, retrying:`, error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    throw new Error(`Job ${jobId} did not complete within ${maxAttempts} attempts`)
  }
}

export const llamaParser = new LlamaParser()