import { assertEnv } from '@/lib/env'

export interface LandingAIResponse {
  markdown: string
  chunks: Array<{
    text: string
    metadata?: Record<string, any>
  }>
  splits?: Array<{
    text: string
    metadata?: Record<string, any>
  }>
  metadata: {
    filename?: string
    page_count?: number
    processing_duration_ms?: number
    [key: string]: any
  }
}

export interface LandingAIUsage {
  processingTimeMs: number
  pages: number
  fileSize: number
  success: boolean
  error?: string
}

export class LandingAIParser {
  private apiKey: string
  private baseUrl: string

  constructor() {
    const env = assertEnv(['LANDING_API_KEY'])
    this.apiKey = env.LANDING_API_KEY!
    this.baseUrl = 'https://api.va.landing.ai/v1/ade'
  }

  async parseDocument(buffer: Buffer, filename: string): Promise<{
    result: LandingAIResponse
    usage: LandingAIUsage
  }> {
    const startTime = Date.now()

    try {
      console.log(`[landing-ai] Starting parse for ${filename}`)

      const formData = new FormData()
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      formData.append('document', new Blob([arrayBuffer]), filename)

      const response = await fetch(`${this.baseUrl}/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      const processingTimeMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[landing-ai] API error: ${response.status} ${errorText}`)
        throw new Error(`Landing AI API error: ${response.status} ${errorText}`)
      }

      const result: LandingAIResponse = await response.json()

      console.log(`[landing-ai] Parse completed in ${processingTimeMs}ms, ${result.metadata.page_count || 0} pages`)

      const usage: LandingAIUsage = {
        processingTimeMs,
        pages: result.metadata.page_count || 0,
        fileSize: buffer.length,
        success: true,
      }

      return { result, usage }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      console.error(`[landing-ai] Parse failed after ${processingTimeMs}ms:`, error)

      const usage: LandingAIUsage = {
        processingTimeMs,
        pages: 0,
        fileSize: buffer.length,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }

      throw { error, usage }
    }
  }

  async parseFromUrl(documentUrl: string): Promise<{
    result: LandingAIResponse
    usage: LandingAIUsage
  }> {
    const startTime = Date.now()

    try {
      console.log(`[landing-ai] Starting parse from URL: ${documentUrl}`)

      const response = await fetch(`${this.baseUrl}/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_url: documentUrl,
        }),
      })

      const processingTimeMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[landing-ai] API error: ${response.status} ${errorText}`)
        throw new Error(`Landing AI API error: ${response.status} ${errorText}`)
      }

      const result: LandingAIResponse = await response.json()

      console.log(`[landing-ai] URL parse completed in ${processingTimeMs}ms, ${result.metadata.page_count || 0} pages`)

      const usage: LandingAIUsage = {
        processingTimeMs,
        pages: result.metadata.page_count || 0,
        fileSize: 0, // Unknown for URL
        success: true,
      }

      return { result, usage }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      console.error(`[landing-ai] URL parse failed after ${processingTimeMs}ms:`, error)

      const usage: LandingAIUsage = {
        processingTimeMs,
        pages: 0,
        fileSize: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }

      throw { error, usage }
    }
  }
}

export const landingAIParser = new LandingAIParser()